import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Fetch last 6 months of transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .gte("transaction_date", sixMonthsAgo.toISOString().split("T")[0])
      .order("transaction_date", { ascending: true });

    if (!transactions || transactions.length < 5) {
      return new Response(JSON.stringify({
        forecast: null,
        anomalies: [],
        insights: ["Add more transactions to unlock AI predictions. We need at least 5 transactions."],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Group by month
    const monthlyData: Record<string, { income: number; expenses: number; categories: Record<string, number> }> = {};
    transactions.forEach((t: any) => {
      const month = t.transaction_date.slice(0, 7);
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0, categories: {} };
      if (t.type === "expense") {
        monthlyData[month].expenses += Number(t.amount);
        monthlyData[month].categories[t.category] = (monthlyData[month].categories[t.category] || 0) + Number(t.amount);
      } else {
        monthlyData[month].income += Number(t.amount);
      }
    });

    // Detect anomalies (simple z-score approach)
    const expenses = Object.values(monthlyData).map(m => m.expenses);
    const mean = expenses.reduce((s, v) => s + v, 0) / expenses.length;
    const stdDev = Math.sqrt(expenses.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / expenses.length);

    const anomalies: { month: string; amount: number; expected: number; deviation: string }[] = [];
    Object.entries(monthlyData).forEach(([month, data]) => {
      if (stdDev > 0) {
        const zScore = (data.expenses - mean) / stdDev;
        if (Math.abs(zScore) > 1.5) {
          anomalies.push({
            month,
            amount: Math.round(data.expenses),
            expected: Math.round(mean),
            deviation: zScore > 0 ? "high" : "low",
          });
        }
      }
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a financial prediction AI for PesaSmart (Tanzania). Analyze spending data and provide:
1. "forecast": Predicted next month spending by category (object with category:amount)
2. "trend": "increasing", "decreasing", or "stable"
3. "predicted_total": predicted total expenses next month (number)
4. "insights": Array of 3-5 specific actionable insights based on patterns

Use TZS currency. Be specific with numbers. Return ONLY valid JSON:
{"forecast":{"Food":150000,"Transport":80000},"trend":"increasing","predicted_total":500000,"insights":["insight1","insight2"]}`,
          },
          {
            role: "user",
            content: `Monthly spending data:\n${JSON.stringify(monthlyData)}\n\nAnomalies detected:\n${JSON.stringify(anomalies)}`,
          },
        ],
      }),
    });

    let predictions;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        predictions = JSON.parse(cleaned);
      } catch {
        predictions = { forecast: null, trend: "stable", predicted_total: Math.round(mean), insights: ["Unable to generate detailed predictions."] };
      }
    } else {
      predictions = { forecast: null, trend: "stable", predicted_total: Math.round(mean), insights: ["AI analysis temporarily unavailable."] };
    }

    return new Response(JSON.stringify({
      ...predictions,
      anomalies,
      monthlyData,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("financial-predictions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
