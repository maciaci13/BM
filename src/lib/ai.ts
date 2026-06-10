import { supabase } from './supabase';

type Lang = 'bg' | 'en';

async function callAI<T = any>(action: string, payload: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message ?? 'AI request failed');
  if (data?.error) throw new Error(data.error);
  return data as T;
}

// ---------- Skin ----------
export type SkinAnalysis = {
  skin_type: string;
  concerns: { name: string; severity: 'mild' | 'moderate' | 'notable'; note: string }[];
  observations: string[];
  recommendations: string[];
  summary: string;
};

export function analyzeSkin(frames: string[], notes: string | undefined, language: Lang) {
  return callAI<SkinAnalysis>('skin_analysis', { frames, notes, language });
}

// ---------- Products ----------
export type ProductAnalysis = {
  name: string;
  brand: string | null;
  category: string | null;
  summary: string;
  ingredients: { name: string; role: string; risk: 'low' | 'medium' | 'high'; note: string }[];
  formula_analysis: string;
  review_summary: {
    overall: string;
    pros: string[];
    cons: string[];
    themes: { theme: string; sentiment: string }[];
    sources: { title: string; url: string }[];
  };
  base_match_score: number;
};

export type Personalization = {
  match_score: number;
  warnings: { ingredient: string; reason: string; level: 'caution' | 'avoid' }[];
  personal_notes: string[];
};

export function identifyProduct(image: string, language: Lang) {
  return callAI<{ name: string; brand: string | null; confidence: number }>('identify_product', { image, language });
}

export function analyzeProduct(
  query: { name: string; brand?: string | null; barcode?: string | null; ingredients_text?: string | null },
  language: Lang,
) {
  return callAI<ProductAnalysis>('analyze_product', { query, language });
}

export function personalize(analysis: ProductAnalysis, profile: any, language: Lang) {
  return callAI<Personalization>('personalize', { analysis, profile, language });
}

export function productChat(
  product: { name: string; brand?: string | null; summary?: string; ingredients_text?: string },
  history: { role: 'user' | 'assistant'; content: string }[],
  question: string,
  profile: any,
  language: Lang,
) {
  return callAI<{ answer: string }>('product_chat', { product, history, question, profile, language });
}

export type AltItem = { name: string; brand: string; similarity: number; basis: string; why: string };

export function findDupes(product: { name: string; brand?: string | null; ingredients_text?: string | null }, language: Lang) {
  return callAI<{ items: AltItem[] }>('dupes', { product, language });
}

export function findAlternatives(
  product: { name: string; brand?: string | null; ingredients_text?: string | null },
  profile: any,
  language: Lang,
) {
  return callAI<{ items: AltItem[] }>('alternatives', { product, profile, language });
}

// ---------- Routine ----------
export type RoutineAnalysis = {
  products: { name: string; brand: string | null; type: string; what_it_does: string; fit_for_user: string }[];
  order_am: string[];
  order_pm: string[];
  conflicts: string[];
  advice: string[];
  summary: string;
};

export function analyzeRoutine(image: string, profile: any, language: Lang) {
  return callAI<RoutineAnalysis>('routine_analysis', { image, profile, language });
}

// ---------- Open Beauty Facts ----------
export type OBFProduct = {
  code: string;
  product_name: string;
  brands: string;
  image_url?: string;
  ingredients_text?: string;
};

export async function obfByBarcode(barcode: string): Promise<OBFProduct | null> {
  try {
    const r = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
    const j = await r.json();
    if (j?.status !== 1 || !j.product) return null;
    const p = j.product;
    return {
      code: barcode,
      product_name: p.product_name ?? '',
      brands: p.brands ?? '',
      image_url: p.image_front_url ?? p.image_url,
      ingredients_text: p.ingredients_text ?? p.ingredients_text_en,
    };
  } catch {
    return null;
  }
}

export async function obfSearch(query: string): Promise<OBFProduct[]> {
  try {
    const r = await fetch(
      `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=12`,
    );
    const j = await r.json();
    return (j.products ?? [])
      .filter((p: any) => p.product_name)
      .map((p: any) => ({
        code: p.code,
        product_name: p.product_name,
        brands: p.brands ?? '',
        image_url: p.image_front_small_url ?? p.image_front_url,
        ingredients_text: p.ingredients_text ?? p.ingredients_text_en,
      }));
  } catch {
    return [];
  }
}

export const cacheKeyFor = (q: { barcode?: string | null; name?: string; brand?: string | null }) =>
  q.barcode?.trim()
    ? `bc:${q.barcode.trim()}`
    : `nm:${(q.brand ?? '').toLowerCase().trim()}|${(q.name ?? '').toLowerCase().trim()}`;
