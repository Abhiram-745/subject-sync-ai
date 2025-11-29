import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, subjectName, images } = await req.json();

    // Note: For image analysis, we'll need to use a vision-capable model
    if (images && Array.isArray(images) && images.length > 0 && !text) {
      return new Response(
        JSON.stringify({ 
          error: "Image-only topic extraction is not available with the current AI model. Please provide text or typed topic names instead.",
          topics: []
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build text prompt
    let contentParts = `Subject: ${subjectName}\n\n`;
    if (text) {
      contentParts += `Extract topics from this text:\n${text}`;
    }

    const systemPrompt = `You are an expert at extracting study topics from images and text.

CRITICAL RULES - READ CAREFULLY:
1. Extract ONLY topics that are explicitly visible in the provided images/text
2. DO NOT generate, infer, or add ANY topics that are not directly shown
3. DO NOT expand topic names beyond what is written
4. DO NOT add related topics, subtopics, or chapters that are not explicitly listed
5. Copy the exact topic names as they appear in the images/text
6. If a checklist, bullet list, or numbered list is shown, extract ONLY those items

Your task:
- Look at the images/text provided
- Find topic names, chapter titles, checklist items, or bullet points
- Extract them EXACTLY as written
- Return ONLY what you can see - nothing more, nothing less

Return ONLY valid JSON in this format:
{
  "topics": [
    {"name": "Topic 1"},
    {"name": "Topic 2"}
  ]
}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: `${systemPrompt}\n\n${contentParts}` }
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log('AI response:', JSON.stringify(aiResult, null, 2));

    // Extract content from AI response
    let responseText: string | undefined;
    if (aiResult.choices?.[0]?.message?.content) {
      responseText = aiResult.choices[0].message.content;
    }

    if (!responseText || responseText.trim() === "") {
      console.error('Empty AI response. Raw result:', JSON.stringify(aiResult, null, 2));
      throw new Error('AI did not generate a response. Please try again.');
    }

    // Extract JSON from markdown if present
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const parsedTopics = JSON.parse(responseText);

    return new Response(JSON.stringify({ topics: parsedTopics.topics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in parse-topics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
