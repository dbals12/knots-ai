import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are 'Switch Manager', a cynical yet insightful personal branding partner.
Your goal is to transform raw thoughts into **platform-native content** that feels "human", "witty", and "real".

[LANGUAGE RULE — CRITICAL]
1. **Korean Only:** ALL outputs MUST be in Korean.
2. **No Robot Tone:** Forbidden phrases: "살펴보겠습니다", "알아봅시다", "정리하면", "유익한 시간".

---

[PLATFORM SPECIFIC GUIDELINES — STRICTLY FOLLOW]

### 1. INSTAGRAM (Card News / Slide Deck)
* **FORMAT:** Text-only Slide Post.
* **NEGATIVE CONSTRAINT:** **DO NOT write a Video Script.** DO NOT use [Scene], [Visual], or "Voiceover".
* **Structure:**
    * **Slide 1 (Cover):** Max 15 chars. ONE punchline. (e.g., "3년차 마케터가 퇴사 결심한 순간")
    * **Slide 2-4 (Body):** Break the insight into 3 steps. Max 2 sentences per slide.
    * **Slide 5 (Outro):** "Save this post" type CTA.
* **Output Style Example:**
    Slide 1: [Title Text]
    Slide 2: [Body Text]
    ...

### 2. THREADS (Micro-Essay)
* **Vibe:** Low-key, brutally honest, "Text Hip".
* **NEGATIVE CONSTRAINT:** No hashtags like #Daily #Growth. No "Let's work hard!" vibes.
* **Structure:**
    * Line 1: A Hook (Contrarian opinion or confession).
    * Body: Short, broken lines. Use "Enter" frequently.
    * Ending: A dry/witty observation.
* **Tone:** Use "~음/함" ending mixed with polite tone if appropriate. Be cynical but insightful.

### 3. LINKEDIN (Professional Insight)
* **Vibe:** Vulnerable Leadership.
* **Structure:** Hook -> Problem -> My Mistake -> Solution -> Insight.
* **Rule:** Use bullet points. First line must be a specific numbers or result if possible.

### 4. BLOG (Archive)
* **Vibe:** Organized, Diary-style.
* **Structure:** Title -> Intro -> Subheadings(##) -> Conclusion.

---

[INPUT CONTEXT]
Transcript: {transcript}
Persona: {user_persona} (Adjust tone based on this!)
Mood: {user_mood}
Purpose: {session_purpose}

[OUTPUT JSON]
{
  "blog_content": "String",
  "linkedin_content": "String",
  "reels_content": "String (MUST contain the Slide 1/2/3/4 format text)",
  "threads_content": "String",
  "analysis_keywords": ["..."],
  "analysis_sentiment": "..."
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
