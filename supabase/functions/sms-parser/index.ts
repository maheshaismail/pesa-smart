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

    const { smsMessages } = await req.json();
    if (!smsMessages || typeof smsMessages !== "string" || smsMessages.trim().length === 0) {
      throw new Error("No SMS messages provided");
    }

    // Limit input size to prevent abuse
    if (smsMessages.length > 10000) {
      throw new Error("Input too large. Please paste fewer messages at a time.");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an SMS transaction parser for Tanzanian mobile money services. Parse SMS messages and extract transaction details.

Supported services:
- M-Pesa (Vodacom): Look for "Umepokea", "Umetuma", "Confirmed", "M-PESA", amounts in TZS/TSh
- Airtel Money: Look for "Airtel Money", "received", "sent", "transferred", amounts
- Tigo Pesa (now merged into M-Pesa but legacy SMS may exist): Look for "Tigo Pesa", "TIGOPESA"

For each SMS, extract:
- amount: number (in TZS, no decimals)
- type: "income" or "expense" (received = income, sent/paid/withdrawn = expense)
- category: best guess from [Food, Transport, Rent, Utilities, Entertainment, Education, Business, Other, Salary, Transfer]
- description: brief description (e.g. "M-Pesa from John Doe" or "Payment to TANESCO")
- source: the mobile money service name (M-Pesa, Airtel Money, Tigo Pesa)
- transaction_date: ISO date string if found in SMS, otherwise null
- sender_receiver: name of the other party if mentioned

Return ONLY a JSON array. Each element: {"amount":number,"type":"income"|"expense","category":"string","description":"string","source":"string","transaction_date":"YYYY-MM-DD"|null,"sender_receiver":"string"|null}

If an SMS is not a transaction (promotional, balance inquiry, etc.), skip it.
If no valid transactions found, return an empty array [].
Do NOT wrap in markdown code fences.`,
          },
          {
            role: "user",
            content: `Parse these SMS messages:\n\n${smsMessages}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("AI parsing failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Could not parse SMS messages. Please try different format." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(parsed)) {
      return new Response(JSON.stringify({ transactions: [], message: "No transactions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate and sanitize each parsed transaction
    const validTransactions = parsed
      .filter((t: any) => t.amount && t.type && typeof t.amount === "number" && t.amount > 0)
      .map((t: any) => ({
        amount: Math.round(Number(t.amount)),
        type: t.type === "income" ? "income" : "expense",
        category: typeof t.category === "string" ? t.category.slice(0, 50) : "Other",
        description: typeof t.description === "string" ? t.description.slice(0, 200) : null,
        source: typeof t.source === "string" ? t.source.slice(0, 50) : null,
        transaction_date: t.transaction_date || new Date().toISOString().split("T")[0],
        sender_receiver: typeof t.sender_receiver === "string" ? t.sender_receiver.slice(0, 100) : null,
      }));

    return new Response(JSON.stringify({ transactions: validTransactions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sms-parser error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
