import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: Get existing outputs as a map
interface ExistingOutputs {
  blog: string;
  linkedin: string;
  reels: string;
  threads: string;
}

function buildRewriteSystemPrompt(): string {
  return `You are a professional Korean content rewriter. Your task is to UPDATE existing content based on user's edited input.

## CRITICAL REWRITE RULES:
1. ALL output MUST be in Korean (한국어).
2. This is a REWRITE/DIFF mode - NOT a fresh generation.
3. PRESERVE the existing format, structure, tone, and style as much as possible.
4. ONLY modify the parts that need to change based on the user's edited input.
5. If the user made minor edits (typos, small sentence changes), keep 90%+ of the existing content.
6. Maintain the same length/word count as the existing content (±10%).

## PLATFORM-SPECIFIC FORMAT REQUIREMENTS:

### Blog (blog_content):
- MUST maintain structure: [제목] + [소제목 2~4개 with ## prefix] + [본문 paragraphs]
- MINIMUM 600 characters, MAXIMUM 1200 characters
- Keep the same number of subtitles as the existing content
- Preserve ## 오늘 느낀 점 section if it exists
- Keep hashtags at the end if they exist

### LinkedIn (linkedin_content):
- Maintain Hook → Context → Insight → Question structure
- Keep the same paragraph count as existing
- Preserve emoji usage pattern if any

### Instagram/Reels (reels_content):
- MUST return valid JSON format: {"Slide 1": "...", "Slide 2": "...", ..., "Caption": "..."}
- Keep the EXACT same number of slides as the existing content
- If existing has 5 slides, output must have 5 slides
- Preserve the slide structure and caption format

### Threads (threads_content):
- Maintain the same line break pattern and short sentence style
- Keep the 4-step structure if it exists: context → emotion → takeaway → hashtag
- Preserve casual/witty tone

## OUTPUT FORMAT:
Return a JSON object with these fields:
- blog_content (string), linkedin_content (string), reels_content (string), threads_content (string)
- analysis_type ("A"|"B"|"C")
- original_summary (1~2줄 한국어 요약 of edited input)
- input_quality { level, reason, suggestion }
- transformation_process { raw_materials{title,content,items[]}, core_point{title,content}, writing_flow{title,content}, format_conversion{title,content} }

## TRANSFORMATION_PROCESS RULES (analysis BEFORE writing — never copy generated content):
- 100% Korean. No robotic tone ("살펴보겠습니다", "정리하면", "~하도록 하겠습니다").
- raw_materials: 반복적으로 드러난 소재/사건/감정/키워드 (items 2~4개, 짧은 한국어).
- core_point: 사용자가 직접 말하지 않았지만 원문에서 드러나는 핵심 인사이트 1개 (1~2문장).
- writing_flow: 화살표 구조 (예: "문제 상황 → 막힌 이유 → 깨달은 점 → 다음 액션"). 매번 다르게.
- format_conversion: 기본 문구 "이 흐름을 블로그, LinkedIn, Instagram, Threads에 맞게 다시 구성했어요."
- 환각 금지: 원문에 없는 직업/회사/수치/프로젝트명 만들지 말 것.
- 입력이 너무 짧으면 input_quality.level = "low" 로 두고 transformation_process 본문은 fallback 문구 사용:
  "아직 기록이 짧아 숨은 흐름을 충분히 발견하기 어려워요. 조금 더 구체적으로 적어주면, 생각의 재료와 글의 흐름을 더 잘 정리해드릴게요."`;
}

function buildRewriteUserPrompt(
  editedRawText: string,
  existingOutputs: ExistingOutputs,
  mood?: string,
  persona?: string,
  purpose?: string
): string {
  // Count slides in existing reels content
  let slideCount = 5;
  try {
    const reelsJson = JSON.parse(existingOutputs.reels);
    slideCount = Object.keys(reelsJson).filter(k => k.toLowerCase().startsWith('slide')).length || 5;
  } catch {
    // If not valid JSON, try to count [Slide X] patterns
    const slideMatches = existingOutputs.reels.match(/\[Slide \d+\]/gi);
    if (slideMatches) slideCount = slideMatches.length;
  }

  return `## USER'S EDITED INPUT (수정된 원문):
"${editedRawText}"

${mood ? `Mood: ${mood}` : ""}
${persona ? `Persona: ${persona}` : ""}
${purpose ? `Purpose: ${purpose}` : ""}

## EXISTING CONTENT TO PRESERVE FORMAT FROM:

### Existing Blog Content:
\`\`\`
${existingOutputs.blog}
\`\`\`

### Existing LinkedIn Content:
\`\`\`
${existingOutputs.linkedin}
\`\`\`

### Existing Instagram/Reels Content (${slideCount} slides):
\`\`\`
${existingOutputs.reels}
\`\`\`

### Existing Threads Content:
\`\`\`
${existingOutputs.threads}
\`\`\`

## INSTRUCTIONS:
1. Compare the edited input with what the existing content is based on.
2. Identify what changed in the user's input.
3. Update ONLY the affected parts of each platform's content.
4. Keep the structure, format, length, and tone identical to the existing content.
5. For Instagram: Return exactly ${slideCount} slides in JSON format with a Caption field.
6. For Blog: Maintain the exact same subtitle structure (## headings).

Return the rewritten content in JSON format.`;
}

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
      .select("id, user_id, selected_mood, selected_persona, session_purpose, raw_text")
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

    // 5) 기존 outputs 조회 (재작성 모드를 위해)
    const { data: existingOutputsData, error: outputsError } = await supabaseAdmin
      .from("outputs")
      .select("platform_type, generated_content")
      .eq("session_id", session_id);

    if (outputsError) {
      console.error("[regenerate-session] Failed to fetch existing outputs:", outputsError);
    }

    // Map existing outputs
    const existingOutputs: ExistingOutputs = {
      blog: "",
      linkedin: "",
      reels: "",
      threads: "",
    };

    if (existingOutputsData) {
      for (const output of existingOutputsData) {
        if (output.platform_type === "blog") existingOutputs.blog = output.generated_content || "";
        if (output.platform_type === "linkedin") existingOutputs.linkedin = output.generated_content || "";
        if (output.platform_type === "reels") existingOutputs.reels = output.generated_content || "";
        if (output.platform_type === "threads") existingOutputs.threads = output.generated_content || "";
      }
    }

    const hasExistingContent = existingOutputs.blog || existingOutputs.linkedin || existingOutputs.reels || existingOutputs.threads;

    // 6) sessions.raw_text 업데이트
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

    // 7) GPT-4o로 콘텐츠 재생성 (REWRITE 모드)
    let systemPrompt: string;
    let userPrompt: string;

    if (hasExistingContent) {
      // REWRITE MODE: 기존 콘텐츠가 있으면 diff 방식으로 재작성
      console.log("[regenerate-session] Using REWRITE mode with existing content");
      systemPrompt = buildRewriteSystemPrompt();
      userPrompt = buildRewriteUserPrompt(
        raw_text.trim(),
        existingOutputs,
        session.selected_mood || undefined,
        session.selected_persona || undefined,
        session.session_purpose || undefined
      );
    } else {
      // FRESH GENERATION MODE: 기존 콘텐츠가 없으면 새로 생성
      console.log("[regenerate-session] Using FRESH generation mode (no existing content)");
      systemPrompt = `You are a professional Korean content writer who creates platform-optimized content.

CRITICAL RULES:
1. ALL output MUST be in Korean (한국어).
2. Create authentic, human-like content for each platform.
3. Maintain the user's voice and intent.

PLATFORM FORMATS:
- Blog: [제목] + [소제목 2~4개 with ## prefix] + [본문]. Minimum 600 chars.
- LinkedIn: Hook → Context → Insight → Question structure.
- Instagram/Reels: JSON format {"Slide 1": "...", "Slide 2": "...", ..., "Caption": "..."}. 5 slides default.
- Threads: Short sentences with line breaks, casual tone.`;

      userPrompt = `User input: "${raw_text.trim()}"
${session.selected_mood ? `Mood: ${session.selected_mood}` : ""}
${session.selected_persona ? `Persona: ${session.selected_persona}` : ""}
${session.session_purpose ? `Purpose: ${session.session_purpose}` : ""}

Generate content for Blog, LinkedIn, Instagram Card News (JSON slides), and Threads.`;
    }

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
                blog_content: { type: "string" },
                linkedin_content: { type: "string" },
                reels_content: { type: "string" },
                threads_content: { type: "string" },
                analysis_type: { type: "string", enum: ["A", "B", "C"] },
                original_summary: { type: "string", description: "1~2줄 한국어 요약" },
                input_quality: {
                  type: "object",
                  properties: {
                    level: { type: "string", enum: ["low", "medium", "high"] },
                    reason: { type: "string" },
                    suggestion: { type: "string" },
                  },
                  required: ["level", "reason", "suggestion"],
                  additionalProperties: false,
                },
                transformation_process: {
                  type: "object",
                  properties: {
                    raw_materials: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                        items: { type: "array", items: { type: "string" } },
                      },
                      required: ["title", "content", "items"],
                      additionalProperties: false,
                    },
                    core_point: {
                      type: "object",
                      properties: { title: { type: "string" }, content: { type: "string" } },
                      required: ["title", "content"],
                      additionalProperties: false,
                    },
                    writing_flow: {
                      type: "object",
                      properties: { title: { type: "string" }, content: { type: "string" } },
                      required: ["title", "content"],
                      additionalProperties: false,
                    },
                    format_conversion: {
                      type: "object",
                      properties: { title: { type: "string" }, content: { type: "string" } },
                      required: ["title", "content"],
                      additionalProperties: false,
                    },
                  },
                  required: ["raw_materials", "core_point", "writing_flow", "format_conversion"],
                  additionalProperties: false,
                },
              },
              required: [
                "blog_content", "linkedin_content", "reels_content", "threads_content",
                "analysis_type", "original_summary", "input_quality", "transformation_process",
              ],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.5,
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

    console.log("[regenerate-session] GPT rewrite complete");

    // 8) outputs 4개 upsert (unique constraint: session_id, platform_type)
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

    // 9) edits 테이블 insert (첫 번째 output 기준으로 기록)
    const { data: firstOutput } = await supabaseAdmin
      .from("outputs")
      .select("id")
      .eq("session_id", session_id)
      .eq("platform_type", "blog")
      .single();

    if (firstOutput) {
      await supabaseAdmin.from("edits").insert({
        output_id: firstOutput.id,
        edit_type: "rewrite",
        refinement_prompt: raw_text.trim(),
      });
    }

    // 9b) Persist analysis fields onto the related draft (no schema change for sessions)
    try {
      const analysisPayload = {
        analysis_type: generatedContent.analysis_type,
        original_summary: generatedContent.original_summary,
        input_quality: generatedContent.input_quality,
        transformation_process: generatedContent.transformation_process,
        blog_content: generatedContent.blog_content,
        linkedin_content: generatedContent.linkedin_content,
        reels_content: generatedContent.reels_content,
        threads_content: generatedContent.threads_content,
        transcript: raw_text.trim(),
      };
      const { data: relatedDraft } = await supabaseAdmin
        .from("drafts")
        .select("id, result_data")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (relatedDraft?.id) {
        const merged = { ...((relatedDraft.result_data as any) || {}), ...analysisPayload };
        await supabaseAdmin.from("drafts").update({ result_data: merged, status: "completed" }).eq("id", relatedDraft.id);
      } else {
        await supabaseAdmin.from("drafts").insert({
          user_id: userId,
          session_id,
          status: "completed",
          promotion_status: "promoted",
          input_data: { textInput: raw_text.trim() },
          result_data: analysisPayload,
        });
      }
    } catch (e) {
      console.error("[regenerate-session] failed to persist analysis on draft:", e);
    }

    // 10) events 테이블 insert
    await supabaseAdmin.from("events").insert({
      event_type: "regenerate_session",
      session_id,
      user_id: userId,
      metadata: {
        raw_text_length: raw_text.trim().length,
        mode: hasExistingContent ? "rewrite" : "fresh",
      },
    });

    console.log(`[regenerate-session] success session_id=${session_id} mode=${hasExistingContent ? "rewrite" : "fresh"}`);

    return new Response(
      JSON.stringify({
        success: true,
        session_id,
        mode: hasExistingContent ? "rewrite" : "fresh",
        outputs: {
          blog_content: generatedContent.blog_content,
          linkedin_content: generatedContent.linkedin_content,
          reels_content: generatedContent.reels_content,
          threads_content: generatedContent.threads_content,
        },
        analysis: {
          analysis_type: generatedContent.analysis_type,
          original_summary: generatedContent.original_summary,
          input_quality: generatedContent.input_quality,
          transformation_process: generatedContent.transformation_process,
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
