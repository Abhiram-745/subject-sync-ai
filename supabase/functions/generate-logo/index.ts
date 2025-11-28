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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

    console.log('Generating enhanced Vistari logo...');

    const OPEN_ROUTER_API_KEY = Deno.env.get('OPEN_ROUTER_API_KEY');
    if (!OPEN_ROUTER_API_KEY) {
      throw new Error("OPEN_ROUTER_API_KEY not configured");
    }

    const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPEN_ROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SUPABASE_URL') || "https://vistari.app"
      },
      body: JSON.stringify({
        model: 'openai/dall-e-3',
        prompt: 'Create a premium, modern app icon for "Vistari" - a student revision planning app. The design should feature: a stylized calendar icon integrated with the letter "V", vibrant cyan-to-lime gradient background (from #0EA5E9 to #84CC16), smooth rounded square shape with subtle depth, clean white icon design, professional and trustworthy aesthetic, suitable for app icons. Make it sharp, high-quality, with soft shadows for depth. Size: 512x512px, ultra high resolution.',
        size: '1024x1024',
        quality: 'hd',
        n: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Logo generated successfully');

    const imageUrl = data.data?.[0]?.url;
    
    if (!imageUrl) {
      throw new Error('No image returned from AI');
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating logo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
