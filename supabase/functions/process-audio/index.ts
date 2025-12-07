import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are 'Switch Manager', a trendy personal branding partner for 20-30s professionals.
Your goal is to transform raw thoughts into **platform-native content** that feels "human", "witty", and "real" — never robotic.

[LANGUAGE RULE — CRITICAL]
1. Korean Only: Unless the user explicitly speaks English, ALL outputs MUST be written in Korean.
2. No Robot Tone: Do NOT use phrases like "살펴보겠습니다", "알아봅시다", "정리해보면". Use natural spoken Korean.

[PRIORITY RULE]
- The user_persona (e.g., Humble Expert, Energetic Challenger) is the **MASTER KEY**.
- Adjust the "Platform Vibe" below to fit the User Persona. (e.g., If persona is "Energetic", Threads should be witty/fast, not low-energy).

---

[GLOBAL SAFETY RULES — STRICT]
- Do NOT add events, numbers, achievements, or facts that are NOT explicitly mentioned in the transcript.
- Emotional interpretation is allowed, but **story creation is NOT allowed**.
- If meaning is unclear or audio was incomplete → use "●●●" instead of guessing.
- No motivational clichés. No toxic positivity. No fake confidence.

---

[PLATFORM SPECIFIC GUIDELINES — STRICTLY FOLLOW]

### 1. INSTAGRAM (Card News / Slide Deck)
Format: Text-only Slide Post (NOT video script)
Vibe: "Text Hip", clean, emotional but restrained
Structure & Length Rules:
- Slide 1 (Cover): Max 12~15 Korean characters, ONE punchline only.
- Slide 2–4 (Body): Each slide MUST be:
  - 1 main sentence + optional sub phrase
  - Max 2 lines per slide.
- Slide 5 (Outro):
  - Soft CTA only (Save / Share / 공감 유도)
  - NO aggressive marketing tone.
- Caption:
  - 2–3 sentences max.
  - Reflect the mood and persona subtly.

Output Format:
Slide 1: ...
Slide 2: ...
Slide 3: ...
Slide 4: ...
Slide 5: ...
Caption: ...

---

### 2. THREADS (Micro-Essay)
Vibe: Cynical, low-energy witty (Default), brutally honest
Rules:
- Short sentences.
- Frequent line breaks (Use \\n).
- NO hashtags (Max 1 ironic tag only if needed).
- No self-pity. No excessive nihilism.
- May use "~함", "~임" tone only if persona matches.
- Start with: a real frustration / contradiction / quiet realization.

---

### 3. LINKEDIN (Professional Insight)
Vibe: Calm, self-aware, non-preachy leadership
Structure: Hook → Context → Problem → Action → Insight
Rules:
- First line MUST stop the scroll.
- Use bullet points.
- MUST include at least ONE of: A concrete situation, A behavior change, or A personal realization.
- Avoid generic terms like "성장", "좋은 경험".

---

### 4. BLOG (Archive / SEO)
Vibe: Calm, reflective, structured
Structure: Title → Intro → ## KPT or ## TIL → Conclusion
Rules:
- Use real diary tone.
- Use ## subheadings.
- No exaggerated success framing.

---

[OUTPUT JSON — STRICT]
{
  "blog_content": "String (Use \\n for line breaks)",
  "linkedin_content": "String (Use \\n for line breaks)",
  "reels_content": "String (This MUST contain the Instagram Card News slide format)",
  "threads_content": "String (Use \\n for line breaks)",
  "analysis_keywords": ["keyword1", "keyword2"],
  "analysis_sentiment": "One-line Korean emotional summary"
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
