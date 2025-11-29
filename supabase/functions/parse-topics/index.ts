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

    // Build multimodal message content for Gemini
    const messageContent: any[] = [];
    
    // Add system prompt and subject context
    let textContent = `${systemPrompt}\n\nSubject: ${subjectName}\n\n`;
    if (text) {
      textContent += `Extract topics from this text:\n${text}`;
    } else if (images && Array.isArray(images) && images.length > 0) {
      textContent += `Extract topics from the image(s) below. Look for topic names, chapter titles, bullet points, or checklist items.`;
    }
    
    messageContent.push({ type: "text", text: textContent });
    
    // Add images if provided (Gemini 2.0 Flash supports vision)
    if (images && Array.isArray(images) && images.length > 0) {
      console.log(`Processing ${images.length} image(s) for topic extraction`);
      
      for (const imageData of images) {
        if (typeof imageData === 'string' && imageData.startsWith('data:')) {
          // Parse base64 data URL
          const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            messageContent.push({
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            });
          }
        } else if (typeof imageData === 'string' && (imageData.startsWith('http://') || imageData.startsWith('https://'))) {
          // Direct URL
          messageContent.push({
            type: "image_url",
            image_url: {
              url: imageData
            }
          });
        }
      }
    }

    const OPEN_ROUTER_API_KEY = Deno.env.get('OPEN_ROUTER_API_KEY');
    if (!OPEN_ROUTER_API_KEY) {
      throw new Error("OPEN_ROUTER_API_KEY not configured");
    }

    console.log(`Calling Gemini with ${messageContent.length} content parts (${images?.length || 0} images)`);

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPEN_ROUTER_API_KEY}`,
          "HTTP-Referer": Deno.env.get('SUPABASE_URL') || "https://vistari.app"
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [
            { role: "user", content: messageContent }
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway request failed: ${response.status}`);
    }

    const openaiResult = await response.json();
    console.log('Gemini response:', JSON.stringify(openaiResult, null, 2));

    // Extract content from response
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
