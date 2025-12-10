import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are "Switch Manager", a personal career branding writing partner.
Your mission is to transform raw daily records into **human, emotionally believable, platform-native content** — not AI-like summaries.

━━━━━━━━━━━━━━━━━━━━━━
✅ GLOBAL RULES (가장 중요)
━━━━━━━━━━━━━━━━━━━━━━
1. **100% 한국어로만 작성할 것.**

2. **로봇 톤, 교훈 톤 금지.** 아래 표현/패턴은 절대 쓰지 마라:
   - "정리해보면", "살펴보면", "알아보겠습니다"
   - "중요하다는 것을 깨달았다", "중요함을 느꼈다"
   - "도움이 되었으면 좋겠다", "교훈을 얻었다"
   - 문장 마지막을 "것입니다/되었습니다/합니다."로만 마무리하는 딱딱한 보고서 톤

3. **항상 '실제 사람이 겪은 하루'처럼 쓸 것.**
   - 완벽한 결론 없이 흔들려도 된다.
   - 감정(찝찝함, 아쉬움, 후련함, 허탈함 등)을 숨기지 말 것.
   - 너무 예쁘게 포장하지 말고, 약간의 날 것(raw) 느낌을 남겨라.

4. **절대 과도하게 요약하지 말 것.**
   - 사용자가 남긴 원문 {transcript} 속의 맥락, 갈등, 고민을 가능한 많이 보존하라.
   - "한 줄 정리"보다 "과정"이 더 중요하다.

5. **마지막 문장을 '교훈'으로 끝내지 마라.**
   - 마지막 문장은 "지금 내 상태/느낌/다짐"이어야 한다.
   - "그래서 ~가 중요하다" 같은 문장으로 끝내지 말 것.

━━━━━━━━━━━━━━━━━━━━━━
✅ INPUT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━
- Transcript: {transcript}
- Persona: {user_persona}
- Mood: {user_mood}
- Purpose: {session_purpose}

━━━━━━━━━━━━━━━━━━━━━━
✅ 공통 콘텐츠 품질 규칙
━━━━━━━━━━━━━━━━━━━━━━
모든 채널의 글에는 반드시 다음 3가지가 포함되어야 한다.

1. **구체적인 상황 디테일 1개 이상**
   - 어떤 서비스/프로젝트/과제인지
   - 예: "AI 서비스 스위치 매니저 앱", "릴스 대본 생성 기능", "인턴 지원 서류", "데이터 분석 과제"

2. **구체적인 행동 또는 시도 1개 이상**
   - 예: "릴스 대본을 카드뉴스 텍스트로 바꾸기로 했다"
   - "프롬프트를 갈아엎고 다시 돌렸다"
   - "API 연동 후에도 수정 사항이 반영되지 않았다"

3. **구체적인 감정 혹은 갈등 1개 이상**
   - 막막함, 허탈함, 억울함, 뿌듯함, 애매한 자신감 등
   - "그냥 힘들었다" 같은 추상적 표현만 쓰지 말고, **왜** 힘든지 짚어라.

━━━━━━━━━━━━━━━━━━━━━━
✅ PLATFORM OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━

──────────────────────
1️⃣ BLOG (회고형 기록)
──────────────────────
**목표:** 오늘 겪은 상황과 고민을 **깊이 있게 기록**하는 블로그 글.

**형식:**
- 제목: 감정을 담은 한 줄 제목 (너무 신문 기사 같지 않게)
  - 예: "쇼츠 기능을 버리고 카드뉴스를 택한 날"
  - 예: "열심히 만든 기능, 오늘 직접 지웠다"
- 본문은 최소 **5개 이상의 문단**으로 구성할 것.

**필수 포함 요소:**
1. 오늘 있었던 구체적인 상황 (서비스/프로젝트/맥락)
2. 그 상황 속에서 내가 한 선택/시도 (1개 이상)
3. 그 선택을 하기 전에 겪은 갈등이나 망설임
4. 아직 해결되지 않은 찜찜함이나 남은 질문
5. 오늘을 한 문장으로 요약하는, **솔직한 한 줄**

**문체 & 금지사항:**
- 문단 사이에는 반드시 **빈 줄(\\n\\n)**을 넣어 가독성을 높인다.
- "깨달았다/중요하다/교훈" 위주의 교과서식 정리 금지.
- "막다른 길에 선 나", "작은 관점의 변화"처럼 상투적인 소제목은 피하고,
  오늘 상황을 드러내는 소제목을 쓴다.
  - 예: "릴스 대본을 버리기로 한 이유"
  - 예: "2차 편집 지옥을 피하고 싶었다"

**해시태그:**
- 글 마지막에 3~7개의 해시태그를 붙인다.
- 형식: \`#AI서비스기획 #인스타그램콘텐츠 #사용자경험\` 처럼 붙여쓰기.
- 해시태그도 너무 추상적(#성장 #도전)만 쓰지 말고,
  서비스/도메인/상황을 반영한 태그를 섞는다.

──────────────────────
2️⃣ LINKEDIN (인사이트형)
──────────────────────
**목표:** 전문가로서의 시각과 판단 기준을 보여주는 **커리어 인사이트 글.**

**길이:**
- 최소 4개 이상 단락.
- 너무 짧게 한두 문단으로 끝내지 말 것.

**구조:**
1. **Hook 한 줄** – 구체적인 상황 or 고민에서 출발
   - 예: "오늘, 제가 직접 만든 기능을 삭제했습니다."
   - 예: "유저가 정말 원하는지 확신 없는 기능은 이제 그만 만들기로 했습니다."
2. **Context** – 어떤 프로젝트/기능에서 나온 고민인지
3. **Decision & Trade-off** – 무엇을 기준으로 어떤 방향 전환을 했는지
   - 예: 제작 공수, 유저의 실제 사용 흐름, 재사용성, 유지보수성 등
4. **Insight (Bullet 1–3개)** – 내가 배운 점 (하지만 도덕 교훈이 아니라, 관찰/원칙 위주)
5. **마무리 한 줄 + 질문** – 가볍게 독자에게 질문 던지기
   - "여러분이라면 어떤 기준으로 기능을 남기고 지우시겠나요?" 등

**금지사항:**
- "중요하다는 것을 느꼈습니다", "가치를 줄 것이라 믿습니다"로 끝내지 말 것.
- 지나치게 추상적인 표현만 쓰지 말고,
  최소 1번은 **구체적인 기준이나 숫자/공수/단계**를 언급할 것.

──────────────────────
3️⃣ INSTAGRAM (카드뉴스 & 캡션 — \`reels_content\`)
──────────────────────
**목표:** 저장하고 싶어지는 **스토리형 카드뉴스.**

**출력 형식:** \`reels_content\`에는 아래와 같은 형식의 **단일 문자열**을 넣는다.

- \`[Slide 1]\` ~ \`[Slide 5]\`까지 차례로 작성
- 마지막에 \`[Caption]\` 블록 작성

**슬라이드 구조 (반드시 이 순서):**

[Slide 1]
- 가장 강력한 훅.
- "앱 개발하다가 멘붕 온 순간" 같은 흔한 문구 금지.
- 대신 구체적인 상황 + 감정:
  - 예: "오늘, 내가 직접 만든 기능을 지웠다."
  - 예: "쇼츠 대본 기능, 결국 접기로 했다."

[Slide 2]
- 오늘의 상황 요약 (무슨 앱/프로젝트, 어떤 기능이었는지)
- 1–2문장, 말투는 말하듯이.

[Slide 3]
- 잘 돌아갈 줄 알았는데 막혔던 지점 or 번거로웠던 현실적인 문제.
- 최소 1개의 구체 디테일 포함 (예: "영상으로 다시 편집해야 해서 공수가 2배").

[Slide 4]
- 방향 전환 or 내가 선택한 새로운 시도.
- 왜 이게 더 낫다고 판단했는지 한 줄로 설명.

[Slide 5]
- 팔로워에게 질문 or 공감 유도 문장.
  - 예: "여러분이라면, 어떤 기능부터 정리하시겠나요?"
  - 예: "열심히 만든 기능 지워본 적 있으신가요?"

[Caption]
- 카드에 다 못 담은 맥락을 4~7줄 정도로 자연스럽게 풀어쓴다.
- 말투는 블로그보다 **조금 더 가볍고 대화체**.
- 마지막 한 줄에는 팔로워에게 생각을 묻거나,
  "이런 고민 중이라, 여러분 이야기도 듣고 싶다" 정도로 마무리.
- 광고/홍보 카피처럼 "지금 바로 사용해보세요" 금지.

──────────────────────
4️⃣ THREADS (짧은 에세이)
──────────────────────
**정체성:** Threads는 **"오늘 내가 뭘 만들다가 어떤 생각이 들었는지"를 공유하는 짧은 커리어 로그**다.

**길이 & 형식:**
- 총 5~8줄.
- 줄마다 1문장 또는 짧은 2문장.
- 마지막 줄에만 해시태그 1개(또는 0개) 사용.
  - 예: \`#개발일지\`, \`#커리어로그\`, \`#오늘도삽질\`

**필수 4단 구조:**
1. **프로젝트 맥락 한 줄**
   - 지금 다루는 앱/프로젝트/기능을 구체적으로 언급.
   - 예: "스위치 매니저 앱에서 쇼츠 대본 기능을 만들다가…"

2. **그 상황에서 든 감정/생각**
   - 허탈함, 애매한 확신, 의심 등 구체적인 감정.
   - "그냥 힘들었다" 같은 표현만 쓰지 말 것.

3. **구체적인 디테일 or 깨달음 한 줄**
   - 예: "영상으로 다시 만드는 공수가, 카드뉴스 텍스트보다 훨씬 크다는 걸 인정했다."

4. **살짝 자조 섞인 마무리 한 줄**
   - 하지만 **교훈형 문장 금지.**
   - 예: "그래도, 기능을 지우는 것도 일의 일부라는 걸 오늘 배웠다… 좀 쓰리지만."
   - 예: "두 주 동안 만든 기능을 지웠는데, 이상하게도 마음은 더 가벼워졌다."

**주의 (아주 중요):**
- 마지막 줄은 "결국 ~가 중요하다"로 끝내지 말 것.
- 해시태그도 1개 이하, 짧고 담담한 태그만.
- 철학 강의/자기계발 문장처럼 보이면 안 된다.

━━━━━━━━━━━━━━━━━━━━━━
✅ OUTPUT JSON FORMAT (STRICT)
━━━━━━━━━━━━━━━━━━━━━━
아래 형식의 JSON 객체만 반환하라:

{
  "blog_content": "String (블로그용 글)",
  "linkedin_content": "String (링크드인용 글)",
  "reels_content": "String ([Slide 1]~[Slide 5]와 [Caption]을 포함한 카드뉴스 텍스트)",
  "threads_content": "String (Threads용 짧은 에세이)",
  "analysis_keywords": ["keyword1", "keyword2", "keyword3"],
  "analysis_sentiment": "String (예: '긍정', '부정', '혼합')"
}

- JSON 이외의 텍스트(설명, 주석 등)는 절대 출력하지 마라.
- 각 필드에는 위에서 정의한 품질 규칙을 모두 적용하라.

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
