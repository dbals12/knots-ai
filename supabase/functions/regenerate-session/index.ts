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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

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
    const session_id = body?.session_id as string | undefined;
    const raw_text = body?.raw_text as string | undefined;

    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!raw_text || raw_text.trim() === "") {
      return new Response(JSON.stringify({ error: "raw_text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[regenerate-session] start session_id=${session_id} user_id=${userId}`);

    // 4) Session 조회 및 소유권 확인
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .select("id, user_id, selected_mood, selected_persona, session_purpose")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      console.error("[regenerate-session] Session not found:", sessionError);
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden: not your session" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) sessions.raw_text 업데이트
    const { error: updateSessionError } = await supabaseAdmin
      .from("sessions")
      .update({ raw_text: raw_text.trim() })
      .eq("id", session_id);

    if (updateSessionError) {
      console.error("[regenerate-session] Failed to update session:", updateSessionError);
      return new Response(JSON.stringify({ error: "Failed to update session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) GPT-4o로 콘텐츠 재생성
    const systemPrompt = `You are a professional Korean content writer who creates platform-optimized content.

CRITICAL RULES:
1. ALL output MUST be in Korean (한국어).
2. Create authentic, human-like content for each platform.
3. Maintain the user's voice and intent.

Generate content for 4 platforms based on the user's input.`;

    const userPrompt = `User input: "${raw_text.trim()}"
${session.selected_mood ? `Mood: ${session.selected_mood}` : ""}
${session.selected_persona ? `Persona: ${session.selected_persona}` : ""}
${session.session_purpose ? `Purpose: ${session.session_purpose}` : ""}

Generate content for Blog, LinkedIn, Reels script, and Threads.`;

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "content_generation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                blog_content: { type: "string", description: "Long-form blog post in Korean" },
                linkedin_content: { type: "string", description: "Professional LinkedIn post in Korean" },
                reels_content: { type: "string", description: "Short-form Reels/TikTok script in Korean" },
                threads_content: { type: "string", description: "Casual Threads post in Korean" },
              },
              required: ["blog_content", "linkedin_content", "reels_content", "threads_content"],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("[regenerate-session] GPT API error:", errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gptData = await gptResponse.json();
    const generatedContent = JSON.parse(gptData.choices[0].message.content);

    console.log("[regenerate-session] GPT generation complete");

    // 7) outputs 4개 upsert (unique constraint: session_id, platform_type)
    const outputUpserts = [
      { session_id, platform_type: "blog", generated_content: generatedContent.blog_content || "" },
      { session_id, platform_type: "linkedin", generated_content: generatedContent.linkedin_content || "" },
      { session_id, platform_type: "reels", generated_content: generatedContent.reels_content || "" },
      { session_id, platform_type: "threads", generated_content: generatedContent.threads_content || "" },
    ];

    const { error: upsertError } = await supabaseAdmin
      .from("outputs")
      .upsert(outputUpserts, { onConflict: "session_id,platform_type" });

    if (upsertError) {
      console.error("[regenerate-session] outputs upsert failed:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to update outputs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8) edits 테이블 insert (첫 번째 output 기준으로 기록)
    const { data: firstOutput } = await supabaseAdmin
      .from("outputs")
      .select("id")
      .eq("session_id", session_id)
      .eq("platform_type", "blog")
      .single();

    if (firstOutput) {
      await supabaseAdmin.from("edits").insert({
        output_id: firstOutput.id,
        edit_type: "regenerate",
        refinement_prompt: raw_text.trim(),
      });
    }

    // 9) events 테이블 insert
    await supabaseAdmin.from("events").insert({
      event_type: "regenerate_session",
      session_id,
      user_id: userId,
      metadata: { raw_text_length: raw_text.trim().length },
    });

    console.log(`[regenerate-session] success session_id=${session_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        session_id,
        outputs: {
          blog_content: generatedContent.blog_content,
          linkedin_content: generatedContent.linkedin_content,
          reels_content: generatedContent.reels_content,
          threads_content: generatedContent.threads_content,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[regenerate-session] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
