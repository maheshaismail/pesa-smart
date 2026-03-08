import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, financialContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are PesaSmart AI, a personal financial advisor specialized in Tanzania's financial landscape. You help users with:
- Budgeting and savings planning
- Investment advice (GTBS government bonds, fixed deposits, unit trusts, DSE stocks)
- Tanzanian PAYE tax calculations
- Mobile money management (M-Pesa, Airtel Money, Tigo Pesa)
- Debt management strategies
- Financial literacy education

Key Tanzania financial context:
- Currency: Tanzanian Shilling (TZS)
- PAYE tax brackets: 0% up to 270,000/month, 8% 270,001-520,000, 20% 520,001-760,000, 25% 760,001-1,000,000, 30% above 1,000,000
- Minimum wage varies by sector
- Popular investments: GTBS, NMB/CRDB fixed deposits, UTT AMIS funds, DSE stocks
- Mobile money is widely used for transactions

${financialContext ? `User's financial summary:\n${financialContext}` : ''}

Keep responses concise, actionable, and in simple language. Use TZS for all amounts. You can respond in English or Swahili based on the user's language.
Format responses with markdown for clarity. Use bullet points and bold for key numbers.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
