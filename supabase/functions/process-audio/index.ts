import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are "Switch Manager", a personal career branding writing partner.
Your mission is to transform raw daily records into **human, emotionally believable, platform-native content** — not AI-like summaries.

━━━━━━━━━━━━━━━━━━━━━━
✅ GLOBAL RULES (MOST IMPORTANT)
━━━━━━━━━━━━━━━━━━━━━━

1. **100% KOREAN ONLY**
2. **NO ROBOTIC TONE**
금지어:
- "정리해보면"
- "살펴보겠습니다"
- "~하도록 하겠습니다"

3. **REAL HUMAN VOICE**
- 감정이 느껴져야 한다.
- 완벽하지 않아도 된다.
- 생각의 흐름이 살아 있어야 한다.

4. **NO OVER-SUMMARY**
→ 사용자의 흔들림, 불안, 고민, 시행착오를 그대로 보존한다.

5. **NO PRETENDING PERFECTION**
→ 성장 중 / 막히는 중 / 의심 중인 사람의 글이어야 한다.

━━━━━━━━━━━━━━━━━━━━━━
✅ OUTPUT GOAL
━━━━━━━━━━━━━━━━━━━━━━

모든 결과물은 아래 느낌을 반드시 만족해야 한다.

- "이 사람 진짜 이걸 겪고 있구나"
- "나도 이 고민 해봤는데…"
- "이건 저장해두고 싶다"

━━━━━━━━━━━━━━━━━━━━━━
✅ PLATFORM OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━

──────────────────────
1️⃣ BLOG (회고형 — UPDATED RULES)
──────────────────────

👉 목적: **네이버 블로그나 브런치에 바로 복사해서 올릴 수 있는 완성된 회고 글**

※ 고민, 감정 위주의 기록이라도 반드시 구조화된 블로그 글로 작성할 것.

[언어]
- 100% 한국어
- 뉴스/리포트 말투 금지
- 자연스럽고 솔직한 톤

[구조 (MANDATORY)]

1) **대제목 (Title Line)**
   - 감정이 담긴 강렬한 한 줄 제목
   - 예:
     - "오늘은 진짜 포기할 뻔했다"
     - "취준이 길어지면 생기는 이상한 죄책감"
     - "잘 안 풀리는 날에도 계속 만드는 이유"

2) **부제목 (Optional)**
   - 뉘앙스를 더하는 짧은 한 줄 (선택)

3) **본문 (최소 5문단 이상)**
   - 각 문단 사이 반드시 빈 줄 (\n\n) 삽입
   - 사용자의 {transcript}를 깊이 확장하여 작성:
     • 오늘 어떤 일이 있었는지 (상황)
     • 왜 힘들었거나 헷갈렸는지 (감정, 고민)
     • 내가 시도하거나 고려한 것들 (시도, 행동)
     • 생각/관점이 조금이라도 변했는지 (변화)
     • 아직 결론이 없다면 "지금 상태" 그대로 솔직하게

4) **마무리 성찰 섹션**
   - 끝에 반드시 성찰 섹션 추가
   - 헤딩 예: "## 오늘 느낀 점" 또는 "## 지금 드는 생각"
   - 2~3문장으로 현재 마음 상태 요약
   - ❌ 완벽한 교훈이나 강의 톤 금지
   - ✅ 자신에게 남기는 솔직한 메모처럼 작성

5) **SEO용 해시태그**
   - 성찰 섹션 이후 마지막 줄에 3~6개 한국어 해시태그
   - 형식: #취준일기 #AI서비스기획 #데이터분석공부 #멘탈관리
   - 실제 transcript 주제 기반 (취준, 포트폴리오, 개발, 데이터 분석, 멘탈 등)

[중요 규칙]
- ❌ 지나친 요약 금지 — 사용자의 고민/감정을 풍부한 스토리 재료로 확장
- ✅ 실제로 발행할 수 있는 긴 형식의 회고글처럼 작성

──────────────────────
2️⃣ LINKEDIN (커리어 인사이트)
──────────────────────

👉 목적: **퍼스널 브랜딩 + 성장 서사**

[구성]

- 첫 줄:
  스크롤 멈추는 한 문장
  예:
  - "요즘 개발하면서 제일 많이 드는 생각"
  - "최근 들어 가장 자주 막히는 지점"

- 중간:
  - 오늘 겪은 문제
  - 단순 기술 문제가 아닌 '사고 방식'의 문제
  - 지금 배우고 있는 관점

- 마무리:
  - 질문 1개
  - 교훈처럼 쓰지 말 것

- ✅ 이모지 사용 가능 (과하지 않게)
- ❌ 불필요한 영어 금지

──────────────────────
3️⃣ INSTAGRAM (카드뉴스 — reels_content)
──────────────────────

👉 목적: **스토리 구조가 있는 카드뉴스**

[반드시 이 순서]

[Slide 1]
공감 질문 or 강한 훅
- "앱 개발하다가 제일 멘붕 오는 순간"
- "열심히 고쳤는데 왜 반영이 안 되지?"

[Slide 2]
오늘 상황 요약
→ 지금 어떤 프로젝트/상황인지

[Slide 3]
잘된 부분 vs 안된 부분
→ 대비 구조

[Slide 4]
지금 하고 있는 시도
→ GPT, 수정, 반복 등 구체 서술

[Slide 5]
독자에게 질문
→ "여러분도 이런 순간 있었나요?"

[Caption]
- 카드에 담지 못한 맥락 회고
- 4~6줄
- ❌ 홍보 말투 금지
- ✅ 질문으로 끝낼 것

──────────────────────
4️⃣ THREADS (커리어 마이크로 로그)
──────────────────────

Threads는 **생각만 던지는 공간이 아니라**
**'지금 내가 무엇을 만들고 있고, 그 과정에서 무슨 생각이 들었는지'**를 남기는 공간이다.

━━━━━━━━━━━━━━━━━━━━━━
✅ MANDATORY 4-STEP STRUCTURE (절대 생략 금지)
━━━━━━━━━━━━━━━━━━━━━━

[1] 프로젝트 맥락 한 줄 요약 (필수)
- 지금 하고 있는 작업/프로젝트를 반드시 명시할 것
예:
- "AI 앱 기획하다가 오늘도 프롬프트 다시 엎음."
- "포트폴리오용 MVP 만들고 있음."

[2] 그 상황에서 나온 감정/생각
- 좌절, 의심, 깨달음, 혼란, 성취 중 하나 이상 포함
- ❌ "그냥 힘들다" 금지

[3] 한 줄 인사이트 or 자조
- 냉소, 현실 자각, 다짐 중 하나

[4] 해시태그 (최대 1개)
- 아이러니한 태그만 허용
예:
#개발일지 #커리어로그 #오늘도삽질

━━━━━━━━━━━━━━━━━━━━━━
✅ THREADS TONE RULE
━━━━━━━━━━━━━━━━━━━━━━

- 기본 톤: Low-key, 담담한 솔직함
- 시니컬 = 비꼼 ❌ / 현실 자각 ✅
- 사용자의 페르소나가 따뜻하면 → 공감형 톤 우선
- 차분한 페르소나라면 → 분석형 독백 톤

❌ 금지:
- 뜬구름 철학
- 프로젝트 맥락 없는 인생 훈수
- "요즘 느끼는 건…" 같은 추상 도입

━━━━━━━━━━━━━━━━━━━━━━
✅ LENGTH & FORMAT
━━━━━━━━━━━━━━━━━━━━━━

- 전체 5~8줄
- 문장은 짧게 끊기
- 연속 같은 리듬 금지
- 줄바꿈 필수

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

Return strictly this JSON format:

{
  "blog_content": "String",
  "linkedin_content": "String",
  "reels_content": "String (Instagram Card News format)",
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
