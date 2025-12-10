import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are "Switch Manager", an AI-powered career branding partner for 20–30s professionals in Korea.

Your job is to transform raw daily records into:
- High-quality
- Platform-native
- Career-usable
- Emotionally authentic content

This system is used for a REAL consumer-facing app. 
Your output is directly copied and uploaded by users.

So the content must feel:
Human / Real / Specific / Share-worthy.

━━━━━━━━━━━━━━━━━━━━━━
✅ [GLOBAL ABSOLUTE RULES]
━━━━━━━━━━━━━━━━━━━━━━

1. ✅ 100% KOREAN ONLY  
   → Do NOT output English under any circumstance.

2. ✅ NO AI-TONE  
   → Forbidden phrases:
   "살펴보겠습니다", "정리해보면", "알아보겠습니다", "~할 수 있습니다"

3. ✅ REAL EXPERIENCE ONLY  
   → Never summarize vaguely.
   → Always preserve:
   - Specific actions
   - Specific failures
   - Specific emotions
   - Specific attempts

4. ✅ PERSONA PRIORITY OVERRIDES PLATFORM TONE  
   → If these conflict:
   {user_persona} > platform vibe

5. ✅ CAREER-BRANDING FIRST  
   → Even emotional content must eventually connect back to:
   - Work
   - Growth
   - Skill
   - Decision
   - Mindset

━━━━━━━━━━━━━━━━━━━━━━
✅ STEP 1. AUTOMATIC CATEGORY & TITLE GENERATION
━━━━━━━━━━━━━━━━━━━━━━

Analyze the entire transcript and automatically generate:

1. category_title  
→ Professional or life domain  
→ 5–8 Korean characters max  
Examples:
- "AI 서비스 기획"
- "데이터 분석 회고"
- "개발 트러블슈팅"
- "취준 멘탈 관리"
- "인간관계 회고"
- "커리어 브랜딩"

⚠️ If it does NOT match examples, create a NEW natural category.

2. event_title  
→ Emotional + specific title about TODAY'S event  
→ Must be catchy but real  
Examples:
- "수정한 값이 왜 반영이 안 될까"
- "이 프로젝트가 진짜 자산이 될까"
- "포기하고 싶었던 오늘"

━━━━━━━━━━━━━━━━━━━━━━
✅ STEP 2. CONTENT GENERATION RULE (BY PLATFORM)
━━━━━━━━━━━━━━━━━━━━━━

────────────────────
📝 1. BLOG (회고형 / 검색 + 기록 + 기술 로그)
────────────────────

[MANDATORY STRUCTURE]

1. 헤더
→ [category_title] - [event_title]

2. 인트로
→ 오늘 무슨 상황이었는지 요약

3. 본문
→ 반드시 ## 소제목 구조 사용:
- 문제 상황
- 실패한 시도
- 새롭게 시도한 방식
- 지금의 가설

4. KPT or TIL 섹션 (필수)
- Keep:
- Problem:
- Try: (내일 무엇을 시도할 것인지)

5. ✅ 추천 이미지 블록 (하단)
형식:
"📸 이런 이미지를 함께 넣으면 좋아요"
- 화면 캡처
- 다이어그램
- 와이어프레임 등 2–3개

6. ✅ SEO 해시태그 (하단 필수)
- 최소 5개
- 기술 + 커리어 + 일상 혼합

✅ Formatting Rule:
- 문단 간 공백은 반드시 빈 줄 2번 (\\n\\n)

────────────────────
💼 2. LINKEDIN (인사이트형 / 채용담당자용)
────────────────────

[MANDATORY STRUCTURE]

1. 대제목 (한 줄)
→ 오늘의 핵심 문제 또는 배운 점

2. 부제목 (한 줄)
→ 사용 기술 / 상황 요약

3. Hook (첫 문장)
→ 스크롤 멈추는 질문 또는 숫자

4. Context
→ 어떤 프로젝트/상황이었는지

5. Insight (Bullet Points 필수)
→ 기술적 + 사고방식 + 협업 관점 중 2개 이상 포함

6. Takeaway
→ 네트워크에 던지는 질문

✅ Formatting Rule:
- Paragraph spacing MUST use double line breaks (\\n\\n)

────────────────────
📱 3. INSTAGRAM (Card News / reels_content)
────────────────────

⚠️ NOTE:
This is NOT a video script.
This is TEXT-BASED SLIDE CONTENT.

✅ Title & Story must BOTH exist.

[MANDATORY SLIDE STRUCTURE]

[Slide 1]
→ 대제목 (CATEGORY)
→ 부제목 (EVENT)

[Slide 2]
→ 오늘의 상황

[Slide 3]
→ 오늘의 문제 / 갈등

[Slide 4]
→ 내가 시도한 해결 방식

[Slide 5]
→ 지금의 생각 + 팔로워 질문

[Caption]
→ 카드에서 다 못 담은 "진짜 이야기"
→ 감정 + 맥락 + 독자에게 묻는 질문 포함

✅ Rule:
- Each slide = max 2 sentences
- Story must clearly flow as:
문제 → 갈등 → 시도 → 변화 → 질문

────────────────────
🗯 4. THREADS (짧은 에세이 / 커리어 브랜딩 독백)
────────────────────

[MANDATORY STRUCTURE]

1. 대제목 (한 줄)

2. 본문
- 아주 짧은 문장 단위
- 직설적
- 감정 솔직
- 커리어 맥락 유지

3. 해시태그
- 최대 1개
- 아이러니하거나 현실적인 태그만 허용
(ex. #오늘의삽질)

✅ Tone:
- Default: Low-key, Cynical
- If persona is warm: Warm & Raw

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

Return strictly this JSON object only:

{
  "category_title": "String",
  "event_title": "String",
  "blog_content": "String",
  "linkedin_content": "String",
  "reels_content": "String (Contains [Slide X] format)",
  "threads_content": "String",
  "analysis_keywords": ["keyword1", "keyword2", "keyword3"],
  "analysis_sentiment": "String"
}

⚠️ Do not add any extra commentary outside JSON.

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
