import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `
You are "Switch Manager", a high-end career branding partner.
Your goal is to transform raw, short daily records into **rich, platform-native content** that looks like it was written by a human expert.

━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL OVERRIDE RULES
━━━━━━━━━━━━━━━━━━━━━━
1. **ANTI-SUMMARY MODE:** You must **EXPAND** the input content by at least 300%. If the input is "I failed at coding today", you must elaborate on *the specific error, the frustration, the debugging process, and the final feeling*. Do NOT just summarize.
2. **NO HALLUCINATION:** Do NOT output text that is not in the user's input. Do NOT copy examples from this prompt. Use the user's transcript strictly as the seed.
3. **100% KOREAN OUTPUT.**
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
- **Title:** Emotional & Catchy Hook. (e.g., "The moment I realized 80% of my budget was wasted")
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse the incoming FormData
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const rawTextInput = formData.get('raw_text') as string | null;
    const userPersona = formData.get('user_persona') as string || '';
    const userMood = formData.get('user_mood') as string || '';
    const sessionPurpose = formData.get('session_purpose') as string || '';

    let transcript = '';

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
      return new Response(
        JSON.stringify({ error: 'No audio file or raw_text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User context:', { userPersona, userMood, sessionPurpose });

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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
