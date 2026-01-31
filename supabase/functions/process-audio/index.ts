import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  - BAD Examples:
    - "6개월의 긴 여정 끝에, 드디어 성사된 계약" (Too poetic)
    - "데이터에 숨겨진 마음을 읽다" (Too abstract)
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
- **BAD:** \`": "Title", "\` or \`": "Content"\` (includes JSON syntax characters)
- **GOOD:** \`"Title"\` or \`"Content"\` (clean text only)
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

// Helper function to update draft status
async function updateDraftStatus(
  supabaseAdmin: any,
  draftId: string,
  status: "processing" | "completed" | "failed",
  resultData?: Record<string, unknown> | null,
  errorMessage?: string
) {
  const updatePayload: Record<string, unknown> = { status };
  
  // processing 상태일 때 result_data를 null로 초기화
  if (status === "processing") {
    updatePayload.result_data = null;
    updatePayload.error_message = null;
  } else {
    if (resultData !== undefined) updatePayload.result_data = resultData;
    if (errorMessage) updatePayload.error_message = errorMessage;
  }

  const { error } = await supabaseAdmin
    .from("drafts")
    .update(updatePayload)
    .eq("id", draftId);

  if (error) {
    console.error("Failed to update draft status:", error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create Supabase admin client for draft updates
  const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // Parse the incoming FormData
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const rawTextInput = formData.get('raw_text') as string | null;
    const userPersona = formData.get('user_persona') as string || '';
    const userMood = formData.get('user_mood') as string || '';
    const sessionPurpose = formData.get('session_purpose') as string || '';
    const draftId = formData.get('draft_id') as string | null;
    const sessionId = formData.get('session_id') as string | null;

    let transcript = '';

    // ✅ 재생성 요청 시 즉시 processing 상태로 전환 + result_data 초기화
    if (draftId) {
      await updateDraftStatus(supabaseAdmin, draftId, "processing");
      console.log('Draft status set to processing:', draftId);
    }

    // Check if raw_text is provided (text-only mode, skip STT)
    if (rawTextInput && rawTextInput.trim().length > 0) {
      console.log('Using raw_text input directly, skipping Whisper STT');
      transcript = rawTextInput.trim();
    } else if (audioFile) {
      // Audio mode: Use Whisper STT
      console.log('Received audio file:', audioFile.name, 'Size:', audioFile.size);
      console.log('Step 1: Starting Whisper transcription...');
      
      const whisperFormData = new FormData();
      whisperFormData.append('file', audioFile, 'audio.webm');
      whisperFormData.append('model', 'whisper-1');

      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: whisperFormData,
      });

      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text();
        console.error('Whisper API error:', whisperResponse.status, errorText);
        
        // Update draft status to failed
        if (draftId) {
          await updateDraftStatus(supabaseAdmin, draftId, "failed", undefined, `Whisper transcription failed: ${errorText}`);
        }
        
        return new Response(
          JSON.stringify({ error: `Whisper transcription failed: ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const whisperResult = await whisperResponse.json();
      transcript = whisperResult.text;
      
      console.log('Whisper transcription completed. Transcript length:', transcript.length);
    } else {
      console.error('No audio file or raw_text provided');
      
      if (draftId) {
        await updateDraftStatus(supabaseAdmin, draftId, "failed", undefined, "No audio file or raw_text provided");
      }
      
      return new Response(
        JSON.stringify({ error: 'No audio file or raw_text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User context:', { userPersona, userMood, sessionPurpose, draftId, sessionId });

    // ========================
    // GPT-4o JSON Generation
    // ========================
    console.log('Step 2: Starting GPT-4o content generation...');

    const userMessage = `Here is the context for content generation:

Raw Transcript:
"${transcript}"

User Persona: ${userPersona || 'Not specified'}
User Mood: ${userMood || 'Not specified'}  
Session Purpose: ${sessionPurpose || 'Not specified'}

Please generate the content for all 4 platforms based on the transcript and user context.`;

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('GPT-4o API error:', gptResponse.status, errorText);
      
      if (draftId) {
        await updateDraftStatus(supabaseAdmin, draftId, "failed", undefined, `GPT content generation failed: ${errorText}`);
      }
      
      return new Response(
        JSON.stringify({ error: `GPT content generation failed: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gptResult = await gptResponse.json();
    const generatedContent = JSON.parse(gptResult.choices[0].message.content);

    console.log('GPT-4o content generation completed');
    console.log('Generated keywords:', generatedContent.analysis_keywords);

    // ========================
    // Update draft status to completed (if draft_id provided)
    // ========================
    if (draftId) {
      const resultData = {
        transcript,
        ...generatedContent,
      };
      await updateDraftStatus(supabaseAdmin, draftId, "completed", resultData);
      console.log('Draft status updated to completed:', draftId);
    }

    // ========================
    // Update session outputs (if session_id provided)
    // ========================
    if (sessionId) {
      // Update session raw_text if it was voice input
      if (transcript) {
        await supabaseAdmin
          .from("sessions")
          .update({ raw_text: transcript })
          .eq("id", sessionId);
      }

      // Insert/update outputs for each platform
      const platforms = [
        { type: "blog", content: generatedContent.blog_content },
        { type: "linkedin", content: generatedContent.linkedin_content },
        { type: "reels", content: generatedContent.reels_content },
        { type: "threads", content: generatedContent.threads_content },
      ];

      for (const platform of platforms) {
        // Upsert: check if exists, update or insert
        const { data: existing } = await supabaseAdmin
          .from("outputs")
          .select("id")
          .eq("session_id", sessionId)
          .eq("platform_type", platform.type)
          .single();

        if (existing) {
          await supabaseAdmin
            .from("outputs")
            .update({ generated_content: platform.content })
            .eq("id", existing.id);
        } else {
          await supabaseAdmin
            .from("outputs")
            .insert({
              session_id: sessionId,
              platform_type: platform.type,
              generated_content: platform.content,
            });
        }
      }
      console.log('Session outputs updated:', sessionId);
    }

    // ========================
    // Return combined result
    // ========================
    const result = {
      transcript,
      content: generatedContent,
    };

    console.log('Process completed successfully');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in process-audio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Try to update draft status if we have draft_id in the error context
    try {
      const formData = await req.clone().formData();
      const draftId = formData.get('draft_id') as string | null;
      if (draftId) {
        await updateDraftStatus(supabaseAdmin, draftId, "failed", undefined, errorMessage);
      }
    } catch {
      // Ignore if we can't get draft_id
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
