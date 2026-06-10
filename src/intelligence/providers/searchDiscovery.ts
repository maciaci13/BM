import type { ReviewDiscoveryProvider } from '../interfaces';
import type { CanonicalProduct, DiscoveredReviewSource } from '../contracts';

export type SearchResultItem = {
  title: string;
  url: string;
  snippet?: string;
};

export type SearchExecutor = (query: string) => Promise<SearchResultItem[]>;

type SourceRule = {
  sourceName: string;
  provider: string;
  hostPatterns: RegExp[];
  querySuffix: string;
};

const SOURCE_RULES: SourceRule[] = [
  {
    sourceName: 'Reddit',
    provider: 'search',
    hostPatterns: [/reddit\.com/i],
    querySuffix: 'site:reddit.com review',
  },
  {
    sourceName: 'Amazon',
    provider: 'search',
    hostPatterns: [/amazon\./i],
    querySuffix: 'site:amazon.com reviews',
  },
  {
    sourceName: 'Sephora',
    provider: 'search',
    hostPatterns: [/sephora\./i],
    querySuffix: 'site:sephora.com reviews',
  },
  {
    sourceName: 'Ulta Beauty',
    provider: 'search',
    hostPatterns: [/ulta\.com/i],
    querySuffix: 'site:ulta.com reviews',
  },
  {
    sourceName: 'Cult Beauty',
    provider: 'search',
    hostPatterns: [/cultbeauty\./i],
    querySuffix: 'site:cultbeauty.com reviews',
  },
  {
    sourceName: 'Lookfantastic',
    provider: 'search',
    hostPatterns: [/lookfantastic\./i],
    querySuffix: 'site:lookfantastic.com reviews',
  },
  {
    sourceName: 'Boots',
    provider: 'search',
    hostPatterns: [/boots\.com/i],
    querySuffix: 'site:boots.com reviews',
  },
  {
    sourceName: 'MakeupAlley',
    provider: 'search',
    hostPatterns: [/makeupalley\.com/i],
    querySuffix: 'site:makeupalley.com reviews',
  },
];

function normalize(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function tokens(value?: string | null): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 1);
}

function productMatchConfidence(product: CanonicalProduct, item: SearchResultItem): number {
  const haystack = normalize(`${item.title} ${item.snippet ?? ''} ${item.url}`);
  const brandTokens = tokens(product.brand);
  const nameTokens = tokens(product.name);

  const matchedBrand = brandTokens.length
    ? brandTokens.filter((token) => haystack.includes(token)).length / brandTokens.length
    : 0.5;
  const matchedName = nameTokens.length
    ? nameTokens.filter((token) => haystack.includes(token)).length / nameTokens.length
    : 0;

  return Math.max(0, Math.min(1, matchedName * 0.75 + matchedBrand * 0.25));
}

function stableId(sourceName: string, url: string): string {
  const compact = url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `search:${sourceName.toLowerCase().replace(/\s+/g, '-')}:${compact}`;
}

function sourceFor(item: SearchResultItem): SourceRule | undefined {
  return SOURCE_RULES.find((rule) => rule.hostPatterns.some((pattern) => pattern.test(item.url)));
}

function dedupe(items: DiscoveredReviewSource[]): DiscoveredReviewSource[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url.replace(/[#?].*$/, '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class SearchReviewDiscoveryProvider implements ReviewDiscoveryProvider {
  constructor(private readonly executeSearch: SearchExecutor) {}

  async discover(product: CanonicalProduct): Promise<DiscoveredReviewSource[]> {
    const label = [product.brand, product.name].filter(Boolean).join(' ').trim();
    const discovered: DiscoveredReviewSource[] = [];

    for (const rule of SOURCE_RULES) {
      const results = await this.executeSearch(`"${label}" ${rule.querySuffix}`);

      for (const item of results) {
        const matchedRule = sourceFor(item);
        if (!matchedRule || matchedRule.sourceName !== rule.sourceName) continue;

        const confidence = productMatchConfidence(product, item);
        if (confidence < 0.35) continue;

        discovered.push({
          id: stableId(rule.sourceName, item.url),
          provider: rule.provider,
          sourceName: rule.sourceName,
          url: item.url,
          sourceProductId: null,
          language: null,
          region: product.region ?? null,
          estimatedReviewCount: null,
          productMatchConfidence: confidence,
          discoveredAt: new Date().toISOString(),
        });
      }
    }

    return dedupe(discovered).sort(
      (a, b) => b.productMatchConfidence - a.productMatchConfidence,
    );
  }
}
