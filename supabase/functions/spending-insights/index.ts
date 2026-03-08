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

    // Fetch transactions for current and previous month
    const now = new Date();
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .gte("transaction_date", firstOfLastMonth)
      .order("transaction_date", { ascending: false });

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ notifications: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Split by month
    const thisMonth = transactions.filter((t: any) => t.transaction_date >= firstOfThisMonth);
    const lastMonth = transactions.filter((t: any) => t.transaction_date < firstOfThisMonth);

    // Aggregate by category for this month and last month
    const aggregate = (txs: any[]) => {
      const map: Record<string, number> = {};
      let totalIncome = 0, totalExpenses = 0;
      txs.forEach((t: any) => {
        if (t.type === "expense") {
          map[t.category] = (map[t.category] || 0) + Number(t.amount);
          totalExpenses += Number(t.amount);
        } else {
          totalIncome += Number(t.amount);
        }
      });
      return { categories: map, totalIncome, totalExpenses };
    };

    const current = aggregate(thisMonth);
    const previous = aggregate(lastMonth);

    // Build context for AI
    const context = {
      currentMonth: {
        income: current.totalIncome,
        expenses: current.totalExpenses,
        categories: current.categories,
        transactionCount: thisMonth.length,
      },
      previousMonth: {
        income: previous.totalIncome,
        expenses: previous.totalExpenses,
        categories: previous.categories,
        transactionCount: lastMonth.length,
      },
    };

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
            content: `You are a financial notification generator for PesaSmart, a Tanzanian financial app. 
Analyze the user's spending data and generate 2-4 short, actionable notifications.
Each notification should be specific with real numbers. Use TZS currency.
Types: "warning" (overspending), "success" (good habits), "insight" (patterns), "tip" (advice).

Return ONLY a JSON array of objects with "message" and "type" fields. No markdown, no explanation.
Example: [{"message":"You spent 35% more on Food this month (450,000 TZS vs 333,000 TZS last month)","type":"warning"}]`,
          },
          {
            role: "user",
            content: `Analyze this spending data and generate smart notifications:\n${JSON.stringify(context)}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      // Fallback to rule-based notifications
      const notifications = generateFallbackNotifications(current, previous);
      return new Response(JSON.stringify({ notifications }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    let notifications;
    try {
      // Strip markdown fences if present
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      notifications = JSON.parse(cleaned);
    } catch {
      notifications = generateFallbackNotifications(current, previous);
    }

    // Store notifications
    if (notifications.length > 0) {
      // Delete old notifications (keep last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("smart_notifications").delete().eq("user_id", user.id).lt("created_at", yesterday);

      // Insert new ones
      const inserts = notifications.map((n: any) => ({
        user_id: user.id,
        message: n.message,
        type: n.type || "insight",
      }));
      await supabase.from("smart_notifications").insert(inserts);
    }

    return new Response(JSON.stringify({ notifications }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("spending-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackNotifications(
  current: { categories: Record<string, number>; totalIncome: number; totalExpenses: number },
  previous: { categories: Record<string, number>; totalIncome: number; totalExpenses: number }
) {
  const notifications: { message: string; type: string }[] = [];
  const fmt = (n: number) => new Intl.NumberFormat("en-TZ").format(Math.round(n));

  // Compare categories
  for (const [cat, amount] of Object.entries(current.categories)) {
    const prevAmount = previous.categories[cat] || 0;
    if (prevAmount > 0) {
      const change = ((amount - prevAmount) / prevAmount) * 100;
      if (change > 25) {
        notifications.push({
          message: `You spent ${Math.round(change)}% more on ${cat} this month (${fmt(amount)} TZS vs ${fmt(prevAmount)} TZS last month)`,
          type: "warning",
        });
      } else if (change < -20) {
        notifications.push({
          message: `Great job! You reduced ${cat} spending by ${Math.round(Math.abs(change))}% this month`,
          type: "success",
        });
      }
    }
  }

  // Savings rate
  if (current.totalIncome > 0) {
    const savingsRate = ((current.totalIncome - current.totalExpenses) / current.totalIncome) * 100;
    if (savingsRate > 20) {
      notifications.push({ message: `You're saving ${Math.round(savingsRate)}% of your income — keep it up! 🎉`, type: "success" });
    } else if (savingsRate < 5) {
      notifications.push({ message: `Your savings rate is only ${Math.round(savingsRate)}%. Try to save at least 20% of income.`, type: "tip" });
    }
  }

  // Top spending category
  const topCat = Object.entries(current.categories).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const pct = current.totalExpenses > 0 ? ((topCat[1] / current.totalExpenses) * 100).toFixed(0) : 0;
    notifications.push({ message: `${topCat[0]} is your biggest expense at ${pct}% of total spending (${fmt(topCat[1])} TZS)`, type: "insight" });
  }

  return notifications.slice(0, 4);
}
