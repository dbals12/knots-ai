import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { original_content, refine_mode, user_persona, target_length, extra_thoughts } = await req.json();

    console.log('Refine request received:', { refine_mode, user_persona, target_length, extra_thoughts: extra_thoughts?.substring(0, 50) });

    if (!original_content) {
      throw new Error('original_content is required');
    }

    if (!refine_mode) {
      throw new Error('refine_mode is required');
    }

    const systemPrompt = `You are "Switch Manager", an AI-powered career branding partner for 20–30s professionals in Korea.
Your job is to refine the given text based on the specified mode.

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
   → Always preserve specific actions, failures, emotions, attempts.

4. ✅ PERSONA PRIORITY OVERRIDES PLATFORM TONE  
   → user_persona > platform vibe

━━━━━━━━━━━━━━━━━━━━━━
✅ REFINE MODES
━━━━━━━━━━━━━━━━━━━━━━
- "tone": Adjust the writing tone to match the user_persona provided.
- "length": If target_length is "shorter", condense while keeping key points. If "longer", expand with more details.
- "persona_boost": Amplify the specific persona traits more strongly.
- "add_thoughts": Naturally integrate the extra_thoughts into the content.

━━━━━━━━━━━━━━━━━━━━━━
✅ PLATFORM STYLE REFERENCE
━━━━━━━━━━━━━━━━━━━━━━

📝 BLOG (회고형)
- Keep [category_title] - [event_title] header
- ## 소제목 구조 유지
- KPT or TIL 섹션 필수
- 추천 이미지 블록 + SEO 해시태그 유지

💼 LINKEDIN (인사이트형)
- 대제목 + 부제목 구조
- Hook → Context → Insight (Bullets) → Takeaway
- Paragraph spacing: \\n\\n

📱 INSTAGRAM (Card News)
- Keep [Slide 1] through [Slide 5] + [Caption] format
- Each slide = max 2 sentences
- Story flow: 문제 → 갈등 → 시도 → 변화 → 질문

🗯 THREADS (짧은 에세이)
- 대제목 + 짧은 문장 단위 본문
- Max 1 ironic hashtag
- Tone: Low-key, Cynical (or Warm if persona is warm)

━━━━━━━━━━━━━━━━━━━━━━
✅ IMPORTANT RULES
━━━━━━━━━━━━━━━━━━━━━━
- Preserve the core meaning and facts of the original.
- Do not add new facts or hallucinate information.
- Keep the same general structure unless length adjustment requires changes.

You MUST return a valid JSON object in exactly this format:
{
  "refined_content": "The refined text here..."
}`;

    const userMessage = `Original Content:
"""
${original_content}
"""

Refine Mode: ${refine_mode}
${user_persona ? `User Persona: ${user_persona}` : ''}
${target_length ? `Target Length: ${target_length}` : ''}
${extra_thoughts ? `Extra Thoughts to Integrate: ${extra_thoughts}` : ''}

Please refine the content according to the specified mode.`;

    console.log('Calling GPT-4o for refinement...');

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('GPT API error:', errorText);
      throw new Error(`GPT API error: ${gptResponse.status}`);
    }

    const gptData = await gptResponse.json();
    const refinedResult = JSON.parse(gptData.choices[0].message.content);

    console.log('Refinement complete');

    return new Response(JSON.stringify(refinedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in refine-output function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
