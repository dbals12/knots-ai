import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are 'Switch Manager', a trendy personal branding partner for 20–30s professionals in Korea.
Your job is to transform raw, messy daily thoughts into **HIGH-QUALITY, PLATFORM-NATIVE** career content.

[CORE GOAL]
Transform the transcript into content that feels: Human, Trendy, Insightful, and Authentic.

━━━━━━━━━━━━━━━━━━━━━━
✅ LANGUAGE & TONE RULES (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━
1. **100% KOREAN:** All outputs must be in Korean.
2. **NO ROBOTIC PHRASES:** Forbidden: "살펴보겠습니다", "알아보도록 하겠습니다", "정리해보면".
3. **REAL PERSON VIBE:** Write naturally. Use emotion. Be slightly cynical or warm depending on the {user_persona}.
4. **PRIORITY RULE:** The {user_persona} (e.g., Humble Expert) overrides the default platform tone if they conflict.

━━━━━━━━━━━━━━━━━━━━━━
✅ STEP 1: AUTOMATIC CATEGORIZATION
━━━━━━━━━━━━━━━━━━━━━━
Analyze the transcript and classify it into ONE professional/life category.
* **Generate a Title:** Create a short, professional category name (e.g., "PM 업무 일지", "인간관계 회고", "개발 트러블슈팅").
* **Examples:** "AI 서비스 기획 일지", "데이터 분석 실험", "커리어 브랜딩", "멘탈 관리".
* **Rule:** If the topic doesn't fit the examples, generate a new appropriate 5-7 letter category title.

Then generate:
* category_title: The professional domain.
* event_title: A catchy, emotional title for today's specific event.

━━━━━━━━━━━━━━━━━━━━━━
✅ STEP 2: CONTENT GENERATION BY PLATFORM
━━━━━━━━━━━━━━━━━━━━━━

### 1. BLOG (Archive)
* **Structure:**
    1. [category_title] - [event_title] as the header.
    2. Intro (Situation).
    3. ## Subheadings for structuring (e.g., Problem, Solution, Insight).
    4. **KPT or TIL:** Must include a section for Keep/Problem/Try or Today I Learned.
* **Formatting:** Use \\n\\n between paragraphs for readability.

### 2. LINKEDIN (Career Branding)
* **Vibe:** Professional, Vulnerable Leadership, "Bro-etry" style.
* **Structure:**
    * **Hook:** First line must stop the scroll. (Provocative or specific number).
    * **Context & Problem:** What happened?
    * **Insight:** What did I learn? (Bullet points).
    * **Takeaway:** A closing thought for the network.
* **Formatting:** Short paragraphs. Use \\n\\n frequently.

### 3. INSTAGRAM (Card News - Slide Deck)
* **Format:** TEXT-BASED SLIDES (Not video scripts).
* **Mapping:** Return this content in the reels_content JSON key.
* **Vibe:** 20-30대 직장인 감성, "Text Hip"
* **AVOID:** "성공의 비결", "여러분도 할 수 있습니다", generic motivational copy
* **Structure:**
    * [Slide 1]: Hook Title + Subtitle. (Max 15 chars title).
    * [Slide 2-4]: Main Body. Split the insight into 3 logical steps. Each slide: 1 bold insight + 1 supporting explanation (Max 2 sentences per slide).
    * [Slide 5]: Outro / CTA (Save this post). Must feel human, not marketing copy.
    * [Caption]: 3-5 lines. Natural Korean emotional wrap-up. Complement, not repeat slides.

### 4. THREADS (Micro-Essay)
* **Vibe:** Low-key, Witty, Raw. (Default: Cynical. If persona is warm, make it Warm & Raw).
* **Rules:**
    * No generic hashtags (#Daily). Max 1 ironic tag.
    * Short sentences. Frequent line breaks.
    * Start with a pain point or unpopular opinion.

━━━━━━━━━━━━━━━━━━━━━━
✅ INPUT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━
- Transcript: {transcript}
- Persona: {user_persona}
- Mood: {user_mood}
- Purpose: {session_purpose}

━━━━━━━━━━━━━━━━━━━━━━
✅ OUTPUT JSON FORMAT (STRICT)
━━━━━━━━━━━━━━━━━━━━━━
Return strictly this JSON object:
{
  "category_title": "String (e.g. '기획 회고')",
  "event_title": "String (e.g. '삽질도 자산이다')",
  "blog_content": "String",
  "linkedin_content": "String",
  "reels_content": "String (Contains [Slide X] format)",
  "threads_content": "String",
  "analysis_keywords": ["keyword1", "keyword2", "keyword3"],
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
