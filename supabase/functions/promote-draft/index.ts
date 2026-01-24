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
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!; // Edge 환경변수에 있어야 함

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ✅ 유저 검증은 getClaims 말고 getUser로 (가장 안정적)
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

    // 4) Draft 조회 (최소 필드만)
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("drafts")
      .select("id, status, input_data, result_data, session_id, user_id")
      .eq("id", draft_id)
      .single();

    if (draftError || !draft) {
      console.error("[promote-draft] Draft not found:", draftError);
      return new Response(JSON.stringify({ error: "Draft not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) 이미 승격된 경우 바로 반환 (idempotent)
    if (draft.session_id) {
      console.log(`[promote-draft] already promoted session_id=${draft.session_id}`);
      return new Response(JSON.stringify({ session_id: draft.session_id, already_promoted: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) status 확인
    if (draft.status !== "completed") {
      return new Response(JSON.stringify({ error: "Draft is not completed yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inputData = (draft.input_data ?? {}) as Record<string, any>;
    const resultData = (draft.result_data ?? {}) as Record<string, any>;

    const rawText = (resultData.transcript as string) || (inputData.textInput as string) || "";

    // 7) sessions 생성
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
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionId = session.id;
    console.log(`[promote-draft] created session=${sessionId}`);

    // 8) outputs 4개 생성
    // ✅ null 넣지 말고 "" (NOT NULL 대비)
    const outputInserts = [
      { session_id: sessionId, platform_type: "blog", generated_content: (resultData.blog_content as string) || "" },
      {
        session_id: sessionId,
        platform_type: "linkedin",
        generated_content: (resultData.linkedin_content as string) || "",
      },
      { session_id: sessionId, platform_type: "reels", generated_content: (resultData.reels_content as string) || "" },
      {
        session_id: sessionId,
        platform_type: "threads",
        generated_content: (resultData.threads_content as string) || "",
      },
    ];

    const { error: outputsError } = await supabaseAdmin.from("outputs").insert(outputInserts);
    if (outputsError) {
      console.error("[promote-draft] outputs insert failed:", outputsError);

      // 실패 시 session 제거 (롤백 느낌)
      await supabaseAdmin.from("sessions").delete().eq("id", sessionId);

      return new Response(JSON.stringify({ error: "Failed to create outputs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 9) ✅ drafts.session_id “락” 업데이트: session_id가 NULL일 때만 업데이트
    // -> 중복 승격 방지의 핵심
    const { error: updateError } = await supabaseAdmin
      .from("drafts")
      .update({ session_id: sessionId, user_id: userId })
      .eq("id", draft_id)
      .is("session_id", null);

    if (updateError) {
      console.warn("[promote-draft] draft update warning:", updateError);
      // 락 업데이트가 실패하면 경쟁조건 가능성 있음 -> 그래도 sessionId 반환은 가능
    }

    // 10) events 로깅 (테이블 컬럼이 다를 수 있으니 실패해도 무시)
    try {
      await supabaseAdmin.from("events").insert({
        event_type: "promote_draft_to_session",
        session_id: sessionId,
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
