// BeautyMatch AI backend — single edge function with an action router.
// Requires the ANTHROPIC_API_KEY secret:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Lang = "bg" | "en";
const langName = (l: Lang) => (l === "bg" ? "Bulgarian" : "English");

async function claude(opts: {
  system: string;
  content: any[];
  webSearch?: boolean;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY secret is not set");

  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
  };
  if (opts.webSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }];
  }

  // Retry on 429 (Tier 1 input-token-per-minute limits are easy to hit).
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    if (res.status !== 429) break;
    const retryAfter = Number(res.headers.get("retry-after")) || 20;
    console.warn(`429 rate limit, waiting ${retryAfter}s (attempt ${attempt + 1})`);
    if (attempt < 2) await new Promise((r) => setTimeout(r, retryAfter * 1000));
  }
  if (!res!.ok) {
    const err = await res!.text();
    console.error("ANTHROPIC_ERROR", res!.status, err);
    if (res!.status === 429) {
      throw new Error(
        "AI услугата е претоварена в момента (лимит на заявките). Опитай пак след минута.",
      );
    }
    throw new Error(`Anthropic API ${res!.status}: ${err.slice(0, 300)}`);
  }
  const data = await res!.json();
  return (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
}

function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI returned no JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

const img = (b64: string) => ({
  type: "image",
  source: { type: "base64", media_type: "image/jpeg", data: b64 },
});

const JSON_ONLY =
  "Respond ONLY with a single valid JSON object. No prose before or after, no markdown fences.";

// ---------------- actions ----------------

async function skinAnalysis(p: { frames: string[]; notes?: string; language: Lang }) {
  const system = `You are a careful cosmetic skin-analysis assistant for the BeautyMatch app. You analyze face photos to describe visible skin characteristics (type, texture, redness, blemishes, dryness/oiliness, visible sensitivity). You are NOT a doctor and do not diagnose medical conditions; phrase findings as visible observations. Write all user-facing text in ${langName(p.language)}. ${JSON_ONLY}
Schema: {"skin_type": string, "concerns": [{"name": string, "severity": "mild"|"moderate"|"notable", "note": string}], "observations": [string], "recommendations": [string], "summary": string}`;
  const content: any[] = p.frames.slice(0, 4).map(img);
  content.push({
    type: "text",
    text: `Analyze the visible skin in these frames captured from a short selfie video (different angles of the same face).${p.notes ? ` User notes: ${p.notes}` : ""}`,
  });
  const text = await claude({ system, content, maxTokens: 2500 });
  return parseJSON(text);
}

async function identifyProduct(p: { image: string; language: Lang }) {
  const system = `You identify cosmetic products from photos. ${JSON_ONLY}
Schema: {"name": string, "brand": string|null, "confidence": number (0-100)}`;
  const text = await claude({
    system,
    content: [img(p.image), { type: "text", text: "Identify this cosmetic product (brand and product name as printed on packaging)." }],
    maxTokens: 500,
  });
  return parseJSON(text);
}

async function analyzeProduct(p: {
  query: { name: string; brand?: string | null; barcode?: string | null; ingredients_text?: string | null };
  language: Lang;
}) {
  const q = p.query;
  const label = `${q.brand ?? ""} ${q.name}`.trim();
  const system = `You are BeautyMatch's cosmetic-formula analyst. Use web search to find: (1) the full INCI ingredient list if not provided, (2) real user reviews and opinions (Reddit, Amazon, beauty forums, social media, retailer reviews). Summarize honestly, including negatives. Write all user-facing text in ${langName(p.language)} (ingredient INCI names stay in Latin). Paraphrase reviews in your own words; never quote them verbatim. ${JSON_ONLY}
Schema: {"name": string, "brand": string|null, "category": string|null, "summary": string (2-3 sentences), "ingredients": [{"name": string, "role": string, "risk": "low"|"medium"|"high", "note": string}], "formula_analysis": string (one paragraph about the formula as a whole: actives, concentration hints, texture, who it suits), "review_summary": {"overall": string, "pros": [string], "cons": [string], "themes": [{"theme": string, "sentiment": string}], "sources": [{"title": string, "url": string}]}, "base_match_score": number (0-100, general quality/safety of the formula)}`;
  const text = await claude({
    system,
    content: [
      {
        type: "text",
        text: `Product: ${label}${q.barcode ? `\nBarcode: ${q.barcode}` : ""}${q.ingredients_text ? `\nKnown INCI list: ${q.ingredients_text}` : ""}\n\nAnalyze the full ingredient list and the cosmetic formula, and summarize real user reviews from the web.`,
      },
    ],
    webSearch: true,
    maxTokens: 3000,
  });
  return parseJSON(text);
}

async function personalize(p: { analysis: any; profile: any; language: Lang }) {
  const system = `You personalize a cosmetic product analysis for a specific user's skin. Be specific about which ingredients matter for THEIR skin type, concerns and allergies. Write in ${langName(p.language)}. ${JSON_ONLY}
Schema: {"match_score": number (0-100, fit for this user), "warnings": [{"ingredient": string, "reason": string, "level": "caution"|"avoid"}], "personal_notes": [string]}`;
  const profileBrief = {
    skin_type: p.profile?.skin_type,
    concerns: p.profile?.skin_concerns,
    allergies: p.profile?.allergies,
    summary: p.profile?.current_skin_analysis?.summary,
    user_notes: p.profile?.current_skin_analysis?.user_notes,
  };
  const text = await claude({
    system,
    content: [
      {
        type: "text",
        text: `User skin profile: ${JSON.stringify(profileBrief)}\n\nProduct analysis: ${JSON.stringify(p.analysis).slice(0, 12000)}`,
      },
    ],
    maxTokens: 1500,
  });
  return parseJSON(text);
}

async function productChat(p: {
  product: { name: string; brand?: string | null; summary?: string; ingredients_text?: string };
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
  profile: any;
  language: Lang;
}) {
  const system = `You answer user questions about the cosmetic product "${p.product.brand ?? ""} ${p.product.name}". Base answers on the formula/ingredients and on real user experiences found via web search (Reddit, Amazon, forums). Be honest about downsides. Consider the user's skin profile when relevant: ${JSON.stringify(
    { skin_type: p.profile?.skin_type, concerns: p.profile?.skin_concerns, allergies: p.profile?.allergies },
  )}. You are not a doctor; for medical conditions suggest checking with a dermatologist while still sharing what users with similar conditions report. Answer in ${langName(p.language)}, conversationally, 2-5 sentences unless more detail is needed. Paraphrase reviews; never quote them verbatim.`;
  const history = p.history.slice(-8).map((m) => `${m.role}: ${m.content}`).join("\n");
  const text = await claude({
    system,
    content: [
      {
        type: "text",
        text: `Product context: ${p.product.summary ?? ""}\nIngredients: ${p.product.ingredients_text ?? "unknown"}\n${history ? `Conversation so far:\n${history}\n` : ""}\nUser question: ${p.question}`,
      },
    ],
    webSearch: true,
    maxTokens: 1500,
  });
  return { answer: text.trim() };
}

async function alternativesOrDupes(p: {
  kind: "dupe" | "alternative";
  product: { name: string; brand?: string | null; ingredients_text?: string | null };
  profile?: any;
  language: Lang;
}) {
  const target =
    p.kind === "dupe"
      ? "Find DUPES: cheaper or equivalent products with a very similar formula/INCI and similar reported results in user reviews."
      : `Find BETTER ALTERNATIVES for this user's skin (profile: ${JSON.stringify({
          skin_type: p.profile?.skin_type,
          concerns: p.profile?.skin_concerns,
          allergies: p.profile?.allergies,
        })}): products in the same category that reviewers with similar skin report better results with.`;
  const system = `You are BeautyMatch's product comparison expert. Use web search (dupe comparisons, INCI databases, Reddit, reviews). ${target} Write user-facing text in ${langName(p.language)}. ${JSON_ONLY}
Schema: {"items": [{"name": string, "brand": string, "similarity": number (0-100), "basis": string (short: formula overlap / review-based), "why": string (1-2 sentences)}]} — return 3-5 items.`;
  const text = await claude({
    system,
    content: [
      {
        type: "text",
        text: `Reference product: ${p.product.brand ?? ""} ${p.product.name}\nINCI: ${p.product.ingredients_text ?? "search for it"}`,
      },
    ],
    webSearch: true,
    maxTokens: 3000,
  });
  return parseJSON(text);
}

async function routineAnalysis(p: { image: string; profile: any; language: Lang }) {
  const system = `You analyze a photo of a user's cosmetics shelf/bag. Recognize each visible product (brand + name when readable, otherwise describe the type). Then, given the user's skin profile ${JSON.stringify(
    {
      skin_type: p.profile?.skin_type,
      concerns: p.profile?.skin_concerns,
      allergies: p.profile?.allergies,
    },
  )}, explain what each product does for THEM, flag conflicts (e.g. retinoids + strong acids same night), and propose the correct AM/PM order. Write in ${langName(p.language)}. ${JSON_ONLY}
Schema: {"products": [{"name": string, "brand": string|null, "type": string, "what_it_does": string, "fit_for_user": string}], "order_am": [string], "order_pm": [string], "conflicts": [string], "advice": [string], "summary": string}`;
  const text = await claude({
    system,
    content: [img(p.image), { type: "text", text: "Recognize the cosmetic products in this photo and analyze the routine." }],
    maxTokens: 2500,
  });
  return parseJSON(text);
}

// ---------------- router ----------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    const action = body.action as string;
    let result: unknown;
    switch (action) {
      case "skin_analysis":
        result = await skinAnalysis(body);
        break;
      case "identify_product":
        result = await identifyProduct(body);
        break;
      case "analyze_product":
        result = await analyzeProduct(body);
        break;
      case "personalize":
        result = await personalize(body);
        break;
      case "product_chat":
        result = await productChat(body);
        break;
      case "dupes":
        result = await alternativesOrDupes({ ...body, kind: "dupe" });
        break;
      case "alternatives":
        result = await alternativesOrDupes({ ...body, kind: "alternative" });
        break;
      case "routine_analysis":
        result = await routineAnalysis(body);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("FN_ERROR", (e as Error).message, (e as Error).stack);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
