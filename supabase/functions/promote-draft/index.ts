import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Authorization 확인
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // 2) Clients
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 유저 검증
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // 3) Body 파싱
    const body = await req.json().catch(() => ({}));
    const draft_id = body?.draft_id as string | undefined;

    if (!draft_id) {
      return new Response(JSON.stringify({ error: "draft_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[promote-draft] start draft_id=${draft_id} user_id=${userId}`);

    // 4) 원자적 락 획득: promotion_status를 'none' -> 'promoting'으로 변경
    const { data: lockResult, error: lockError } = await supabaseAdmin
      .from("drafts")
      .update({ promotion_status: "promoting" })
      .eq("id", draft_id)
      .eq("promotion_status", "none")
      .select("id, status, input_data, result_data, session_id, user_id, promotion_status")
      .maybeSingle();

    // 락 획득 실패 시: 이미 승격 중이거나 완료된 상태
    if (!lockResult) {
      // 현재 상태 조회해서 이미 승격된 경우 session_id 반환
      const { data: existingDraft } = await supabaseAdmin
        .from("drafts")
        .select("session_id, promotion_status")
        .eq("id", draft_id)
        .single();

      if (existingDraft?.session_id) {
        console.log(`[promote-draft] already promoted session_id=${existingDraft.session_id}`);
        return new Response(
          JSON.stringify({ session_id: existingDraft.session_id, already_promoted: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existingDraft?.promotion_status === "promoting") {
        return new Response(
          JSON.stringify({ error: "Promotion in progress, please wait" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Draft not found or already processed" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const draft = lockResult;

    // 5) status 확인
    if (draft.status !== "completed") {
      // 락 해제
      await supabaseAdmin
        .from("drafts")
        .update({ promotion_status: "none" })
        .eq("id", draft_id);

      return new Response(JSON.stringify({ error: "Draft is not completed yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inputData = (draft.input_data ?? {}) as Record<string, any>;
    const resultData = (draft.result_data ?? {}) as Record<string, any>;

    const rawText = (resultData.transcript as string) || (inputData.textInput as string) || "";

    // 6) sessions 생성
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .insert({
        user_id: userId,
        input_type: (inputData.inputMode as string) || "text",
        raw_text: rawText,
        selected_mood: inputData.selectedMood ?? null,
        selected_persona: inputData.selectedPersona ?? null,
        session_purpose: inputData.sessionPurpose ?? null,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("[promote-draft] session insert failed:", sessionError);
      // 락 해제
      await supabaseAdmin
        .from("drafts")
        .update({ promotion_status: "none" })
        .eq("id", draft_id);

      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionId = session.id;
    console.log(`[promote-draft] created session=${sessionId}`);

    // 7) outputs 4개 upsert (unique constraint 활용)
    const outputUpserts = [
      { session_id: sessionId, platform_type: "blog", generated_content: (resultData.blog_content as string) || "" },
      { session_id: sessionId, platform_type: "linkedin", generated_content: (resultData.linkedin_content as string) || "" },
      { session_id: sessionId, platform_type: "reels", generated_content: (resultData.reels_content as string) || "" },
      { session_id: sessionId, platform_type: "threads", generated_content: (resultData.threads_content as string) || "" },
    ];

    const { error: outputsError } = await supabaseAdmin
      .from("outputs")
      .upsert(outputUpserts, { onConflict: "session_id,platform_type" });

    if (outputsError) {
      console.error("[promote-draft] outputs upsert failed:", outputsError);

      // 롤백: session 제거 + 락 해제
      await supabaseAdmin.from("sessions").delete().eq("id", sessionId);
      await supabaseAdmin
        .from("drafts")
        .update({ promotion_status: "none" })
        .eq("id", draft_id);

      return new Response(JSON.stringify({ error: "Failed to create outputs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8) 승격 완료: drafts.session_id와 promotion_status='promoted' 업데이트
    const { error: finalizeError } = await supabaseAdmin
      .from("drafts")
      .update({ session_id: sessionId, user_id: userId, promotion_status: "promoted" })
      .eq("id", draft_id);

    if (finalizeError) {
      console.warn("[promote-draft] draft finalize warning:", finalizeError);
    }

    // 9) events 로깅
    try {
      await supabaseAdmin.from("events").insert({
        event_type: "promote_draft_to_session",
        session_id: sessionId,
        user_id: userId,
        metadata: { draft_id, session_id: sessionId },
      });
    } catch (e) {
      console.warn("[promote-draft] event log skipped:", e);
    }

    console.log(`[promote-draft] success draft=${draft_id} -> session=${sessionId}`);

    return new Response(JSON.stringify({ session_id: sessionId, success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[promote-draft] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
