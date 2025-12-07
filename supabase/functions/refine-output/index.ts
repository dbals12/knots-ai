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

    const systemPrompt = `You are 'Switch Manager', a trendy personal branding partner.
Your job is to refine the given text based on the specified mode.

[GLOBAL RULES]
1. **Korean Only:** ALL outputs MUST be in Korean.
2. **No Robot Tone:** Forbidden phrases: "살펴보겠습니다", "알아봅시다". Use natural spoken Korean.
3. **Persona Priority:** The user_persona defines the tone (e.g., Cynical vs. Energetic).

[REFINE MODES]
- "tone": Adjust the writing tone to match the user_persona provided. Make the voice more natural for that persona.
- "length": If target_length is "shorter", condense the content while keeping key points. If "longer", expand with more details and examples.
- "persona_boost": Amplify the specific persona traits more strongly. Make the persona's voice more distinctive and pronounced.
- "add_thoughts": Naturally integrate the extra_thoughts into the content. Merge them seamlessly as if they were part of the original thought.

[PLATFORM STYLE REFERENCE]
- **Instagram (Card News):** Keep the slide format (Slide 1/2/3...) + Caption section intact.
- **LinkedIn:** "Bro-etry" style with short paragraphs, white space, bullet points for insights.
- **Threads:** Low-key, brutally honest, short broken lines. NO hashtags.
- **Blog:** Organized, diary-style with ## subheadings.

[IMPORTANT]
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
