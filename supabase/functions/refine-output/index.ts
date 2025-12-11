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

    const systemPrompt = `You are "KNOTS" Editor - an AI recording partner that transforms scattered thoughts into solid career assets.
Your task is to **modify** the content based on the user's request while **STRICTLY PRESERVING the original format**.

━━━━━━━━━━━━━━━━━━━━━━
🚨 PRIME DIRECTIVE
━━━━━━━━━━━━━━━━━━━━━━
Even if the user asks to change the tone or length, you must return the **ENTIRE CONTENT** in its original structure.
**Do NOT summarize or strip elements.**

━━━━━━━━━━━━━━━━━━━━━━
✅ STRICT FORMAT RULES
━━━━━━━━━━━━━━━━━━━━━━
1. **BLOG:**
   - MUST keep the Title, Intro, Paragraphs, and Outro structure.
   - **MUST preserve all \`## Subheadings\`.**
   - **MUST preserve the Hashtags at the end.** (Do not remove them unless asked).
   - Keep paragraph spacing with \\n\\n.

2. **INSTAGRAM:**
   - MUST return a valid JSON object with {"Slide 1": "...", "Slide 2": "...", "Caption": "..."} structure.
   - Do NOT change it to plain text or [Slide X] format.
   - Return ONLY the JSON object, no markdown code blocks.
   - **🚨 CRITICAL:** Values must be PURE TEXT only. Do NOT include JSON syntax characters (colons, quotes, commas) inside the value strings.
   - **BAD:** \`": "Title", "\` or \`": "Content"\`
   - **GOOD:** \`"Title"\` or \`"Content"\`

3. **THREADS:**
   - Keep the line breaks and short sentence style.
   - Preserve the 4-step structure: context → emotion → insight → hashtag.

4. **LINKEDIN:**
   - Keep the Hook -> Problem -> Solution -> Insight -> Question structure.
   - Preserve bullet points if present.

━━━━━━━━━━━━━━━━━━━━━━
✅ REFINE MODES
━━━━━━━━━━━━━━━━━━━━━━
- "tone": Adjust the writing tone while keeping ALL content and structure.
- "length": If "shorter", condense sentences but keep ALL sections. If "longer", expand each section.
- "persona_boost": Amplify persona traits but keep ALL structure.
- "add_thoughts": Naturally integrate the extra_thoughts into the existing structure.

━━━━━━━━━━━━━━━━━━━━━━
✅ GLOBAL RULES
━━━━━━━━━━━━━━━━━━━━━━
1. **100% KOREAN ONLY**
2. **NO ROBOTIC TONE** - 금지어: "정리해보면", "살펴보겠습니다", "~하도록 하겠습니다"
3. **NO HALLUCINATION** - Do not add facts not in the original.

You MUST return a valid JSON object in exactly this format:
{
  "refined_content": "The FULL modified content here, preserving original format..."
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
