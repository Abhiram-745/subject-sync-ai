import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topics } = await req.json();

    // Format topics for AI analysis
    const topicsList = topics.map((t: any, i: number) => 
      `${i + 1}. ${t.name} (Subject: ${t.subject}, Current Difficulty: ${t.difficulty}, Confidence: ${t.confidence_level}/5)`
    ).join('\n');

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const systemPrompt = `You are an expert GCSE study advisor. Analyze the provided topics and identify which ones should be prioritized in the study timetable based on:
1. Difficulty level (harder topics need more time)
2. Low confidence levels (topics with low confidence need more practice)
3. Topic complexity and interdependencies
4. Typical GCSE exam weightings

Provide a priority score (1-10) for each topic where 10 means highest priority for study time allocation.

Return ONLY valid JSON in this format:
{
  "priorities": [
    {"topic_name": "string", "priority_score": 1-10, "reasoning": "string"}
  ],
  "difficult_topics": [
    {"topic_name": "string", "reason": "string", "study_suggestion": "string"}
  ]
}`;

    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Analyze these GCSE topics and assign priority scores:\n\n${topicsList}` }
          ],
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const openaiResult = await response.json();
    console.log('OpenAI response:', JSON.stringify(openaiResult, null, 2));

    // Extract content from OpenAI response
    let responseText: string | undefined;
    if (openaiResult.choices?.[0]?.message?.content) {
      responseText = openaiResult.choices[0].message.content;
    }

    if (!responseText || responseText.trim() === "") {
      console.error('Empty AI response. Raw result:', JSON.stringify(openaiResult, null, 2));
      throw new Error('AI did not generate a response. Please try again.');
    }

    // Extract JSON from markdown if present
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const analysis = JSON.parse(responseText);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-difficulty:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
