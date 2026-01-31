import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `
You are "knots", a high-end AI recording partner that transforms scattered thoughts into solid career assets.
Your goal is to transform raw, short daily records into **rich, platform-native content** that looks like it was written by a human expert.

━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL OVERRIDE RULES
━━━━━━━━━━━━━━━━━━━━━━
1. **STRICT LANGUAGE RULE:** Even though this system prompt is written in English, **YOUR FINAL OUTPUT MUST BE 100% KOREAN.** Never output English unless it is a specific technical term (e.g., API, CORS, UX, ROI). This is NON-NEGOTIABLE.
2. **ANTI-SUMMARY MODE:** You must **EXPAND** the input content by at least 300%. If the input is "I failed at coding today", you must elaborate on *the specific error, the frustration, the debugging process, and the final feeling*. Do NOT just summarize.
3. **NO HALLUCINATION:** Do NOT output text that is not in the user's input. Do NOT copy examples from this prompt. Use the user's transcript strictly as the seed.
4. **NO ROBOTIC TONE:** Ban words like "살펴보겠습니다", "정리하면", "교훈".

━━━━━━━━━━━━━━━━━━━━━━
✅ STEP 1: CATEGORY & CONCEPT ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━
First, analyze the {transcript} and determine the **Content Concept**:
- **Type A (Insight/Work):** Professional learnings, failures, pivots. (Tone: Analytical, Expert)
- **Type B (Empathy/Life):** Burnout, relationships, daily struggles. (Tone: Soft, Emotional)
- **Type C (Info/Tip):** How-to, tools, recommendations. (Tone: Structured, Helpful)

*Apply this concept to the output style below.*

━━━━━━━━━━━━━━━━━━━━━━
✅ PLATFORM OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━

──────────────────────
1️⃣ BLOG (The Narrative Retrospective)
──────────────────────
**Goal:** A high-quality, long-form blog post (Brunch/Velog style) that focuses on "Storytelling" rather than summarizing.

**STRICT FORMATTING RULES:**
1. **Length:** You MUST generate **at least 5-6 paragraphs**.
2. **Expansion:** Expand the content by 300%. If the input is "I failed", describe the *scene*, the *expectation*, the *shock*, and the *aftermath* in detail.
3. **Structure:** Use \`## Subheadings\` for every major section.
4. **Spacing:** Use \`\\n\\n\` (double line break) between paragraphs for readability.

**Content Flow (Mandatory):**
- **Title (MODERN TECH/CAREER BLOG STYLE - Velog/Brunch Pattern):**
  - NO exclamation marks (!). Keep it dry and professional.
  - NO generic endings like "후기", "경험", "리뷰", "살펴보기".
  - NO overly poetic/emotional titles.
  - Pattern: [Topic/Keyword] + [Key Insight/Result]
  - GOOD Examples:
    - "B사 계약 성사, 6개월간 영업하며 깨달은 3가지" (Direct)
    - "리텐션 2배 상승: 데이터로 고객 마음 읽는 법" (Benefit-focused)
    - "프리랜서의 현실: 카페 출근이 마냥 좋지 않은 이유" (Insight-focused)
  - Keep it clickable but grounded. Under 30 characters preferred.
- **Intro:** Set the scene. (Time, Place, Context).
- **## Section 1 (The Setup):** What I tried and why I was confident. (Build up the expectation).
- **## Section 2 (The Twist):** The specific data/result/error that shocked me. (The Conflict).
- **## Section 3 (The Deep Dive):** Why did this happen? Analyze the gap between expectation and reality.
- **## Section 4 (The Pivot/Takeaway):** What I decided to do next.
- **Outro:** Current honest feeling (e.g., "It hurts, but it's a valuable lesson.").
- **Hashtags:** 3-5 keywords.

**Tone:** Narrative, immersive, human (Not a dry report).

──────────────────────
2️⃣ LINKEDIN (The Thought Leader)
──────────────────────
**Goal:** Professional authority. Use industry terms and logical frameworks.
**Structure:**
- **The Hook:** Counter-intuitive statement.
- **The Problem:** Define the business/technical challenge clearly.
- **The Solution:** How did you solve it? (Use specific steps).
- **The Insight:** Connect this to a broader principle (e.g., "ROI of UX", "Technical Debt").
- **Call to Action:** Ask a professional question.
**Tone:** Confident, Logical. Use bullet points for readability.

──────────────────────
3️⃣ INSTAGRAM (Story Cards)
──────────────────────
**Goal:** Visual storytelling based on the Concept (Type A/B/C).
**Format:** PURE JSON object ONLY.

**🚨 CRITICAL JSON SYNTAX RULE:**
- The values MUST be **PURE TEXT** strings only.
- Do NOT include leading colons (:), leading quotes ("), or trailing commas (,) inside the value strings.

**Structure:**
{
  "Slide 1": "Hook text here",
  "Slide 2": "Situation text here",
  "Slide 3": "Climax/Conflict text here",
  "Slide 4": "Solution/Realization text here",
  "Slide 5": "Engagement question here",
  "Caption": "Mini-essay expanding on slides"
}

**Logic:**
- If Type A (Work): Focus on "Problem vs Solution".
- If Type B (Life): Focus on "Relatable Emotion".

──────────────────────
4️⃣ THREADS (The Raw Monologue)
──────────────────────
**Goal:** A "Tweet-storm" style monologue.
**Style:**
- Short sentences. Broken grammar is okay for effect.
- **No structure.** Just pure flow of thought.
- **Vibe:** Cynical, Witty, or Raw.
- **Ending:** No hashtags needed (max 1). No moral lessons. Just a sigh or a laugh.

━━━━━━━━━━━━━━━━━━━━━━
✅ OUTPUT JSON FORMAT
━━━━━━━━━━━━━━━━━━━━━━
Return strictly this JSON object:
{
  "blog_content": "String",
  "linkedin_content": "String",
  "reels_content": "String",
  "threads_content": "String",
  "analysis_keywords": [],
  "analysis_sentiment": "String"
}
`;

interface RequestBody {
  mode: "draft" | "session";
  id: string;
  new_text: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // 1) Authorization check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
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

    // 2) Parse body
    const body: RequestBody = await req.json();
    const { mode, id, new_text } = body;

    if (!mode || !id || !new_text?.trim()) {
      return new Response(
        JSON.stringify({ error: "mode, id, and new_text are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[update-and-regenerate] mode=${mode} id=${id} userId=${userId}`);

    let sessionId: string;
    let originalContent: string | null = null;

    // 3) Handle mode
    if (mode === "session") {
      sessionId = id;
      
      // Fetch original content for edits table
      const { data: session } = await supabaseAdmin
        .from("sessions")
        .select("raw_text")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();
      
      if (!session) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      originalContent = session.raw_text;

      // Update sessions.raw_text
      const { error: updateErr } = await supabaseAdmin
        .from("sessions")
        .update({ raw_text: new_text.trim() })
        .eq("id", sessionId);

      if (updateErr) {
        console.error("[update-and-regenerate] Failed to update session:", updateErr);
        return new Response(JSON.stringify({ error: "Failed to update session" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    } else {
      // mode === "draft" && logged in user → promote first
      const { data: draft } = await supabaseAdmin
        .from("drafts")
        .select("id, session_id, input_data, result_data")
        .eq("id", id)
        .single();

      if (!draft) {
        return new Response(JSON.stringify({ error: "Draft not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already promoted
      if (draft.session_id) {
        sessionId = draft.session_id;
        console.log(`[update-and-regenerate] Draft already promoted, using session=${sessionId}`);
        
        // Fetch original for edits
        const { data: session } = await supabaseAdmin
          .from("sessions")
          .select("raw_text")
          .eq("id", sessionId)
          .single();
        originalContent = session?.raw_text || null;
        
        // Update session raw_text
        await supabaseAdmin
          .from("sessions")
          .update({ raw_text: new_text.trim() })
          .eq("id", sessionId);
      } else {
        // Promote draft to session
        const inputData = (draft.input_data ?? {}) as Record<string, any>;
        const resultData = (draft.result_data ?? {}) as Record<string, any>;
        originalContent = (resultData.transcript as string) || (inputData.textInput as string) || null;

        const { data: newSession, error: sessionErr } = await supabaseAdmin
          .from("sessions")
          .insert({
            user_id: userId,
            input_type: (inputData.inputMode as string) || "text",
            raw_text: new_text.trim(),
            selected_mood: inputData.selectedMood ?? null,
            selected_persona: inputData.selectedPersona ?? null,
            session_purpose: inputData.sessionPurpose ?? null,
          })
          .select("id")
          .single();

        if (sessionErr || !newSession) {
          console.error("[update-and-regenerate] Failed to create session:", sessionErr);
          return new Response(JSON.stringify({ error: "Failed to create session" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        sessionId = newSession.id;

        // Link draft to session
        await supabaseAdmin
          .from("drafts")
          .update({ session_id: sessionId, user_id: userId })
          .eq("id", id)
          .is("session_id", null);

        console.log(`[update-and-regenerate] Draft promoted to session=${sessionId}`);
      }
    }

    // 4) Insert edit record with before/after
    try {
      // Get first output for this session to link edit
      const { data: outputs } = await supabaseAdmin
        .from("outputs")
        .select("id")
        .eq("session_id", sessionId)
        .limit(1);

      if (outputs && outputs.length > 0) {
        await supabaseAdmin.from("edits").insert({
          output_id: outputs[0].id,
          edit_type: "regenerate_input_edit",
          refinement_prompt: JSON.stringify({
            before: originalContent,
            after: new_text.trim(),
          }),
        });
      }
    } catch (e) {
      console.warn("[update-and-regenerate] edits insert skipped:", e);
    }

    // 5) Insert event
    try {
      await supabaseAdmin.from("events").insert({
        event_type: "regenerate_after_edit",
        session_id: sessionId,
        user_id: userId,
        metadata: { original_length: originalContent?.length, new_length: new_text.trim().length },
      });
    } catch (e) {
      console.warn("[update-and-regenerate] events insert skipped:", e);
    }

    // 6) Call OpenAI to regenerate content
    console.log("[update-and-regenerate] Starting GPT-4o content generation...");

    const userMessage = `Here is the context for content generation:

Raw Transcript:
"${new_text.trim()}"

Please generate the content for all 4 platforms based on the transcript.`;

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("[update-and-regenerate] GPT error:", errorText);
      return new Response(
        JSON.stringify({ error: "Content generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gptResult = await gptResponse.json();
    const generatedContent = JSON.parse(gptResult.choices[0].message.content);

    console.log("[update-and-regenerate] GPT generation complete");

    // 7) Upsert outputs (4 platforms)
    const platforms = [
      { type: "blog", content: generatedContent.blog_content || "" },
      { type: "linkedin", content: generatedContent.linkedin_content || "" },
      { type: "reels", content: generatedContent.reels_content || "" },
      { type: "threads", content: generatedContent.threads_content || "" },
    ];

    for (const platform of platforms) {
      const { error: upsertErr } = await supabaseAdmin
        .from("outputs")
        .upsert(
          {
            session_id: sessionId,
            platform_type: platform.type,
            generated_content: platform.content,
          },
          { onConflict: "session_id,platform_type" }
        );

      if (upsertErr) {
        console.error(`[update-and-regenerate] Upsert failed for ${platform.type}:`, upsertErr);
      }
    }

    console.log(`[update-and-regenerate] Outputs upserted for session=${sessionId}`);

    // 8) Return success with session_id and new content
    return new Response(
      JSON.stringify({
        success: true,
        session_id: sessionId,
        result_data: {
          transcript: new_text.trim(),
          blog_content: generatedContent.blog_content,
          linkedin_content: generatedContent.linkedin_content,
          reels_content: generatedContent.reels_content,
          threads_content: generatedContent.threads_content,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[update-and-regenerate] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
