import type { ProductResolver } from '../interfaces';
import type {
  CanonicalProduct,
  ProductResolutionInput,
  ProductResolutionResult,
} from '../contracts';
import type { EvidenceRef } from '../../contracts/common';

const API_BASE = 'https://world.openbeautyfacts.org';

type ObfProduct = {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  image_front_url?: string;
  image_url?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  countries?: string;
};

function normalize(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function similarity(a?: string | null, b?: string | null): number {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.82;

  const leftTokens = new Set(left.split(/\s+/).filter(Boolean));
  const rightTokens = new Set(right.split(/\s+/).filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
}

function toCanonicalProduct(product: ObfProduct, input: ProductResolutionInput): CanonicalProduct {
  const name = product.product_name?.trim() || product.generic_name?.trim() || input.name || 'Unknown product';
  const brand = product.brands?.split(',')[0]?.trim() || input.brand || null;
  const nameScore = input.name ? similarity(name, input.name) : 0.7;
  const brandScore = input.brand ? similarity(brand, input.brand) : 0.7;
  const barcodeScore = input.barcode && product.code === input.barcode ? 1 : 0;
  const resolutionConfidence = Math.max(
    barcodeScore,
    Math.min(1, nameScore * 0.7 + brandScore * 0.3),
  );

  return {
    id: `obf:${product.code ?? `${normalize(brand)}:${normalize(name)}`}`,
    name,
    brand,
    barcode: product.code ?? input.barcode ?? null,
    region: product.countries?.split(',')[0]?.trim() || input.region || null,
    imageUrl: product.image_front_url ?? product.image_url ?? null,
    category: product.categories?.split(',')[0]?.trim() || null,
    formulationVersion: null,
    resolutionConfidence,
  };
}

function evidenceFor(product: ObfProduct): EvidenceRef[] {
  if (!product.code) return [];
  return [
    {
      id: `obf-product:${product.code}`,
      source: 'Open Beauty Facts',
      title: product.product_name || product.generic_name || product.code,
      url: `${API_BASE}/product/${encodeURIComponent(product.code)}`,
      capturedAt: new Date().toISOString(),
    },
  ];
}

async function fetchByBarcode(barcode: string): Promise<ObfProduct | null> {
  const response = await fetch(`${API_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json`);
  if (!response.ok) return null;
  const payload = await response.json();
  return payload?.status === 1 && payload.product ? payload.product : null;
}

async function searchProducts(input: ProductResolutionInput): Promise<ObfProduct[]> {
  const query = [input.brand, input.name].filter(Boolean).join(' ').trim();
  if (!query) return [];

  const response = await fetch(
    `${API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=12`,
  );
  if (!response.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload?.products) ? payload.products : [];
}

export class OpenBeautyFactsProductResolver implements ProductResolver {
  async resolve(input: ProductResolutionInput): Promise<ProductResolutionResult> {
    let candidates: ObfProduct[] = [];

    if (input.barcode) {
      const exact = await fetchByBarcode(input.barcode);
      if (exact) candidates = [exact];
    }

    if (!candidates.length) {
      candidates = await searchProducts(input);
    }

    if (!candidates.length) {
      throw new Error('No matching product found in Open Beauty Facts');
    }

    const ranked = candidates
      .map((candidate) => ({
        raw: candidate,
        product: toCanonicalProduct(candidate, input),
      }))
      .sort((a, b) => b.product.resolutionConfidence - a.product.resolutionConfidence);

    const [best, ...rest] = ranked;

    return {
      product: best.product,
      alternatives: rest.slice(0, 4).map((entry) => entry.product),
      evidence: evidenceFor(best.raw),
    };
  }
}
