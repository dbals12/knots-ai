import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth 헤더에서 유저 확인
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // User client for auth verification
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // 2. Request body 파싱
    const { draft_id } = await req.json();
    if (!draft_id) {
      return new Response(JSON.stringify({ error: "draft_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[promote-draft] Starting promotion for draft_id: ${draft_id}, user_id: ${userId}`);

    // 3. Draft 조회
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("drafts")
      .select("*")
      .eq("id", draft_id)
      .single();

    if (draftError || !draft) {
      console.error("[promote-draft] Draft not found:", draftError);
      return new Response(JSON.stringify({ error: "Draft not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. 이미 승격된 경우 기존 session_id 반환
    if (draft.session_id) {
      console.log(`[promote-draft] Already promoted to session_id: ${draft.session_id}`);
      return new Response(JSON.stringify({ session_id: draft.session_id, already_promoted: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Status 확인
    if (draft.status !== "completed") {
      console.error("[promote-draft] Draft status is not completed:", draft.status);
      return new Response(JSON.stringify({ error: "Draft is not completed yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inputData = draft.input_data as Record<string, unknown> | null;
    const resultData = draft.result_data as Record<string, unknown> | null;

    // 6. Session 생성
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .insert({
        user_id: userId,
        input_type: (inputData?.inputMode as string) || "text",
        raw_text: (resultData?.transcript as string) || (inputData?.textInput as string) || "",
        selected_mood: (inputData?.selectedMood as string) || null,
        selected_persona: (inputData?.selectedPersona as string) || null,
        session_purpose: (inputData?.sessionPurpose as string) || null,
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("[promote-draft] Failed to create session:", sessionError);
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[promote-draft] Created session: ${session.id}`);

    // 7. Outputs 생성 (4개 플랫폼)
    const platforms = ["blog", "linkedin", "reels", "threads"];
    const outputInserts = platforms.map((platform) => ({
      session_id: session.id,
      platform_type: platform,
      generated_content: (resultData?.[`${platform}_content`] as string) || null,
    }));

    const { error: outputsError } = await supabaseAdmin.from("outputs").insert(outputInserts);

    if (outputsError) {
      console.error("[promote-draft] Failed to create outputs:", outputsError);
      // Rollback session (optional, but good practice)
      await supabaseAdmin.from("sessions").delete().eq("id", session.id);
      return new Response(JSON.stringify({ error: "Failed to create outputs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[promote-draft] Created 4 outputs for session: ${session.id}`);

    // 8. Event 기록
    const { error: eventError } = await supabaseAdmin.from("events").insert({
      user_id: userId,
      event_type: "promote_draft_to_session",
      metadata: { draft_id, session_id: session.id },
    });

    if (eventError) {
      console.warn("[promote-draft] Failed to log event (non-critical):", eventError);
    }

    // 9. Draft에 session_id 업데이트 (중복 승격 방지)
    const { error: updateError } = await supabaseAdmin
      .from("drafts")
      .update({ session_id: session.id, user_id: userId })
      .eq("id", draft_id);

    if (updateError) {
      console.warn("[promote-draft] Failed to update draft session_id:", updateError);
    }

    console.log(`[promote-draft] Successfully promoted draft ${draft_id} to session ${session.id}`);

    return new Response(
      JSON.stringify({ session_id: session.id, success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[promote-draft] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
