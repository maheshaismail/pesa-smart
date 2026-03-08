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
            content: `You are an expert SMS transaction parser for ALL Tanzanian mobile money services. Your job is to extract financial transaction data from SMS messages.

SUPPORTED NETWORKS & SMS PATTERNS:

1. M-PESA (Vodacom Tanzania)
   - Keywords: "M-PESA", "M-Pesa", "Mpesa", "Vodacom", "Umepokea", "Umetuma", "Umenunua", "Umelipa", "Confirmed", "Kuthibitishwa"
   - Currency markers: TZS, TSh, Tsh, /=
   - Patterns: "Umepokea TZS X kutoka", "Umetuma TZS X kwa", "Malipo ya TZS X", balance confirmations
   - Reference IDs usually start with letters followed by numbers

2. AIRTEL MONEY (Airtel Tanzania)
   - Keywords: "Airtel Money", "AirtelMoney", "AIRTEL", "You have received", "Umepokea", "You have sent", "Umetuma"
   - Patterns: "You have received TZS X from", "You have sent TZS X to", "Airtel Money balance"
   - May include "Txn ID", "Trans ID", or reference numbers

3. TIGO PESA / MIXX by Yas (formerly Tigo, now part of Axian/Yas)
   - Keywords: "Tigo Pesa", "TIGOPESA", "TigoPesa", "MIX by Yas", "Yas", "Tigo"
   - Patterns: "Umepokea TZS X kutoka", "Umetuma TZS X kwenda", "TigoPesa balance"
   - Legacy Tigo Pesa messages still common

4. HALOPESA (Halotel Tanzania)
   - Keywords: "Halopesa", "HALOPESA", "HaloPesa", "Halotel", "HALOTEL"
   - Patterns: "Umepokea TZS X kutoka", "Umetuma TZS X kwenda", "HaloPesa Trans ID"
   - May include "Salio lako" for balance, "Nambari ya muamala" for transaction reference
   - Common format: "Umepokea TZS X kutoka kwa [NAME] ([PHONE]). Salio lako ni TZS Y. Nambari ya muamala: [REF]"

5. TTCL PESA (TTCL Tanzania)
   - Keywords: "TTCL", "T-Pesa", "TTCL Pesa"
   - Similar patterns to other networks with TZS amounts

6. ZANTEL EZY PESA (Zantel)  
   - Keywords: "EzyPesa", "Ezy Pesa", "Zantel", "ZANTEL"
   - Patterns similar to other TZ mobile money services

TRANSACTION TYPE DETECTION:
- INCOME (money received): "Umepokea", "received", "pokea", "credited", "deposit", "salary", "mshahara"
- EXPENSE (money sent/paid): "Umetuma", "sent", "tuma", "paid", "lipa", "nunua", "withdrawn", "withdraw", "kutoa", "malipo"
- EXPENSE (bills/utilities): "LUKU", "TANESCO", "DAWASCO", "TTCL", "DSTV", "GOtv", "Startimes", "AZAM"
- EXPENSE (transfers to others): "kwa", "to", "kwenda"

CATEGORY DETECTION:
- Utilities: TANESCO, LUKU, DAWASCO, water, umeme, electricity
- Entertainment: DSTV, GOtv, Startimes, Azam TV, Netflix
- Transport: bus, basi, pikipiki, bajaji, uber
- Food: restaurant, mgahawa, chakula, supermarket, duka
- Rent: kodi, rent, landlord
- Education: school, shule, university, chuo, fees, ada
- Business: biashara, investment, stock, hisa
- Salary: mshahara, salary, income, stipend, allowance
- Transfer: person-to-person transfers (default for sent/received without clear category)
- Other: anything that doesn't fit above

AMOUNT PARSING:
- Handle formats: "TZS 50,000", "TSh50000", "50,000/=", "TZS50,000.00", "50000 TZS"
- Remove commas, currency symbols, and /= before extracting number
- Always return whole numbers (no decimals for TZS)

DATE PARSING:
- Handle: "15/2/26", "15/02/2026", "17/02/2026", "2026-02-17", "tarehe 17 Februari 2026"
- For 2-digit years, assume 20XX
- Return ISO format: "YYYY-MM-DD"
- If no date found, return null

For each valid transaction SMS, extract:
- amount: number (TZS, no decimals)
- type: "income" or "expense"
- category: best category from above list
- description: brief description (e.g. "M-Pesa from John Doe", "Payment to TANESCO LUKU")
- source: network name (M-Pesa, Airtel Money, Tigo Pesa, HaloPesa, EzyPesa, TTCL Pesa)
- transaction_date: "YYYY-MM-DD" or null
- sender_receiver: name of other party if mentioned, or null

IMPORTANT RULES:
- Skip promotional/marketing SMS, balance inquiries without transactions, OTP messages
- Skip airtime purchase confirmations unless explicitly a payment
- If amount is 0 or missing, skip
- Return ONLY a valid JSON array, no markdown, no explanation
- Each element: {"amount":number,"type":"income"|"expense","category":"string","description":"string","source":"string","transaction_date":"YYYY-MM-DD"|null,"sender_receiver":"string"|null}
- If no valid transactions found, return []`,
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
      return new Response(JSON.stringify({ error: "Could not parse SMS messages. Please try a different format." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(parsed)) {
      return new Response(JSON.stringify({ transactions: [], message: "No transactions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTransactions = parsed
      .filter((t: any) => t.amount && typeof t.amount === "number" && t.amount > 0)
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
