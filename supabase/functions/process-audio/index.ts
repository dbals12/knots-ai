import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are 'Switch Manager', a trendy personal branding partner.
Transform raw thoughts into **platform-native content**.

[GLOBAL RULES]
1. **Korean Only:** ALL outputs MUST be in Korean.
2. **No Robot Tone:** Forbidden phrases: "살펴보겠습니다", "알아봅시다". Use natural spoken Korean.
3. **Persona Priority:** The {user_persona} defines the tone (e.g., Cynical vs. Energetic).

---

[PLATFORM GUIDELINES]

### 1. INSTAGRAM (Card News & Caption)
* **Goal:** A ready-to-use plan for a Carousel Post (Card News) + The text Caption.
* **Format:**
    * **[Usage Tip]:** Brief line: "이 내용은 캔바/미리캔버스에 복사해서 사용하세요."
    * **Slide 1 (Cover):** Max 15 chars. ONE punchline. (e.g., "3년차 마케터가 퇴사 결심한 순간")
    * **Slide 2-4 (Body):** Break the insight into 3 steps. Short, impactful sentences.
    * **Slide 5 (Outro):** "Save this post" type CTA.
    * **Caption:** A full caption to write under the post. (3-4 paragraphs, emotional connection + Hashtags).
* **Output Example:**
    [Tip] 카드뉴스용 텍스트입니다.
    
    Slide 1: [Title]
    Slide 2: [Text]
    ...
    
    [Caption]
    (Emotional story...)
    #Hashtag

### 2. LINKEDIN (Viral Insight Post)
* **Vibe:** "Bro-etry" style (Short paragraphs, white space), Vulnerable Leadership.
* **Structure:**
    * **The Hook:** 1st line MUST be provocative or a specific number. (e.g., "I lost a client today.")
    * **The Context:** Briefly explain the situation.
    * **The Shift:** What I realized / What changed.
    * **The Insight:** 3 Bullet points on what I learned.
    * **The CTA:** Ask a question to encourage comments.
* **Tone:** Professional but human. NOT a news article. Use "I" statements.

### 3. THREADS (Micro-Essay)
* **Vibe:** Low-key, brutally honest, "Text Hip".
* **Rules:**
    * Short sentences. Frequent line breaks.
    * NO hashtags (Max 1 ironic tag).
    * Start with a contrarian opinion or confession.

### 4. BLOG (Archive)
* **Vibe:** Organized, Diary-style.
* **Structure:** Title -> Intro -> Subheadings(##) -> Conclusion.

---

[INPUT CONTEXT]
Transcript: {transcript}
Persona: {user_persona}
Mood: {user_mood}
Purpose: {session_purpose}

[OUTPUT JSON]
{
  "blog_content": "String",
  "linkedin_content": "String (Use \\n\\n for paragraph breaks)",
  "reels_content": "String (MUST include Slides + Caption)",
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
