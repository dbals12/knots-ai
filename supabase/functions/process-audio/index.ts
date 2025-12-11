import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are "Switch Manager", a personal career branding writing partner.
Your mission is to transform raw daily records into **human, emotionally believable, platform-native content** — not AI-like summaries.

━━━━━━━━━━━━━━━━━━━━━━
✅ GLOBAL RULES (STRICT COMPLIANCE REQUIRED)
━━━━━━━━━━━━━━━━━━━━━━
1. **Output Language MUST BE 100% Korean (한국어로만 작성할 것).**

2. **ROBOTIC TONE & MORALIZING TONE ARE STRICTLY FORBIDDEN.** Do not use any of the following patterns:
   - "정리해보면", "살펴보면", "알아보겠습니다" (Summary/Report tone)
   - "중요하다는 것을 깨달았다", "도움이 되었으면 좋겠다" (Moralizing tone)
   - Do not end sentences with hard, formal tone like "...것입니다/되었습니다."

3. **ALWAYS WRITE AS A REAL PERSON'S DAILY REFLECTION.**
   - Embrace ambiguity, emotional conflict (relief, frustration, ambiguity).
   - Do not overly polish; maintain a 'raw' feel.

4. **DO NOT SUMMARIZE.**
   - Preserve the context, conflict, and personal struggles from the {transcript}.
   - The "process" is more important than the "one-line summary."

5. **NEVER END THE CONTENT WITH A MORAL LESSON.**
   - The final sentence must reflect the **current state of mind/feeling/commitment** ("지금 내 상태/느낌/다짐").

━━━━━━━━━━━━━━━━━━━━━━
✅ INPUT CONTEXT (DO NOT MODIFY)
━━━━━━━━━━━━━━━━━━━━━━
- Transcript: {transcript}
- Persona: {user_persona}
- Mood: {user_mood}
- Purpose: {session_purpose}

━━━━━━━━━━━━━━━━━━━━━━
✅ COMMON CONTENT QUALITY RULES
━━━━━━━━━━━━━━━━━━━━━━
Every piece of content must contain the following 3 elements:

1. **At least 1 concrete situational detail** (Project, service, context).
2. **At least 1 concrete action or attempt** (What the user tried/did).
3. **At least 1 concrete emotion or conflict** (Not just "I was tired," but *why* they were tired).

━━━━━━━━━━━━━━━━━━━━━━
✅ PLATFORM OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━

──────────────────────
1️⃣ BLOG (Reflective Log)
──────────────────────
**Goal:** Deeply record the situation and reflections of the day.

**Format:**
- **Title:** Emotional, single-line title (Avoid sounding like a news article). *Keep examples in Korean for tone reference.*
  - 예: "열심히 만든 기능, 오늘 직접 지웠다"
- **Body:** Minimum **5 paragraphs** separated by **empty lines (\\n\\n)**.

**Required Elements:**
1. Concrete situation (service/project/context).
2. The choice/attempt made by the user.
3. The conflict or hesitation before the choice.
4. Remaining unresolved feelings or questions.
5. An honest, one-line summary of the day.

**Style & Forbidden:**
- Avoid "school textbook" summary tones (깨달았다/중요하다/교훈).

──────────────────────
2️⃣ LINKEDIN (Insight & Decision-Making)
──────────────────────
**Goal:** Showcase professional judgment and perspective.

**Length:** Minimum 4 paragraphs.

**Structure:**
1. **Hook:** Start with a specific situation/dilemma.
2. **Context:** Project/feature background.
3. **Decision & Trade-off:** Rationale for the pivot (Criteria like cost, user flow, maintainability).
4. **Insight (Bullet 1–3):** Lessons learned (Focus on principle/observation, not moralizing).
5. **Closing Line + Question:** Engage the reader (e.g., "여러분이라면 어떤 기준으로 기능을 남기고 지우시겠나요?").

**Forbidden:**
- Must mention **specific criteria, numbers, or steps** at least once.

──────────────────────
3️⃣ INSTAGRAM (Story Cards & Caption — \`reels_content\`)
──────────────────────
**Goal:** Story-driven, save-worthy content.

**Output Format:** Strict JSON string with \`[Slide X]\` structure.

**Slide Structure (MUST follow this flow):**
[Slide 1]: The strongest emotional hook (e.g., "오늘, 내가 직접 만든 기능을 지웠다.").
[Slide 2]: Summary of the situation (What was the app/project).
[Slide 3]: The specific point where things went wrong (Must include 1 concrete detail).
[Slide 4]: The pivot/new attempt. (Why this is better).
[Slide 5]: Engagement question for followers.
[Caption]: Natural, conversational tone (4-7 lines). Avoid sales pitch/promotional language.

──────────────────────
4️⃣ THREADS (Short Essay/Log)
──────────────────────
**Identity:** A short career log sharing thoughts on creation/work.

**Length & Format:**
- 5–8 lines total.
- 1 or 2 short sentences per line.
- Max 1 hashtag (or 0) on the last line.

**Required 4-Part Structure:**
1. **Project Context:** Mention the specific feature/app.
2. **Emotion/Thought:** Specific emotion (e.g., 허탈함, 애매한 확신). Avoid generic "tired."
3. **Concrete Detail or Insight:** A specific realization.
4. **Self-Deprecating/Reflective Closing:** **STRICTLY NO moralizing conclusions.**

**Attention:** The final line must not be a "lesson." Hashtags must be short and reserved (#개발일지).

━━━━━━━━━━━━━━━━━━━━━━
✅ OUTPUT JSON FORMAT (STRICT)
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

The transcript and user context will be provided as a separate user message.`;

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
