import type { ReviewNormalizer } from '../interfaces';
import type {
  NormalizedReview,
  RawReview,
  ReviewCorpus,
  ReviewSignal,
} from '../contracts';

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeRating(value?: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value <= 1) return Math.max(0, Math.min(5, value * 5));
  if (value <= 5) return Math.max(0, Math.min(5, value));
  if (value <= 10) return Math.max(0, Math.min(5, value / 2));
  if (value <= 100) return Math.max(0, Math.min(5, value / 20));
  return null;
}

function detectLanguage(text: string, fallback?: string | null): string {
  if (fallback?.trim()) return fallback.trim().toLowerCase();
  if (/[а-яА-Я]/.test(text)) return 'bg';
  return 'en';
}

function textHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizedFingerprint(review: RawReview): string {
  const body = normalizeWhitespace(review.body).toLowerCase();
  const title = normalizeWhitespace(review.title ?? '').toLowerCase();
  return textHash(`${title}|${body}`);
}

function calculateQualityScore(review: RawReview): number {
  const body = normalizeWhitespace(review.body);
  let score = 0.35;

  if (body.length >= 40) score += 0.15;
  if (body.length >= 120) score += 0.15;
  if (body.length >= 300) score += 0.1;
  if (review.rating != null) score += 0.05;
  if (review.reviewDate) score += 0.05;
  if (review.verifiedPurchase) score += 0.08;
  if ((review.helpfulVotes ?? 0) > 0) score += 0.04;
  if ((review.helpfulVotes ?? 0) >= 5) score += 0.03;

  const excessiveCaps = body.length > 20 && body === body.toUpperCase();
  const repeatedChars = /(.)\1{5,}/.test(body);
  const tooShort = body.length < 12;

  if (excessiveCaps) score -= 0.1;
  if (repeatedChars) score -= 0.1;
  if (tooShort) score -= 0.25;

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function evidenceId(review: RawReview): string {
  return `review:${review.provider}:${review.providerReviewId}`;
}

function normalizeReview(productId: string, review: RawReview): NormalizedReview {
  const body = normalizeWhitespace(review.body);
  const title = review.title ? normalizeWhitespace(review.title) : null;

  return {
    id: `${review.provider}:${review.providerReviewId}`,
    productId,
    sourceId: review.sourceId,
    rating: normalizeRating(review.rating),
    title,
    body,
    reviewDate: review.reviewDate ?? null,
    language: detectLanguage(`${title ?? ''} ${body}`, review.language),
    country: review.country ?? null,
    verifiedPurchase: review.verifiedPurchase ?? null,
    helpfulVotes: review.helpfulVotes ?? null,
    skinType: null,
    concerns: [],
    duplicateOf: null,
    qualityScore: calculateQualityScore(review),
    evidenceId: evidenceId(review),
  };
}

function deduplicate(reviews: RawReview[]): Map<string, string> {
  const canonicalByFingerprint = new Map<string, string>();
  const duplicateOf = new Map<string, string>();

  for (const review of reviews) {
    const fingerprint = normalizedFingerprint(review);
    const currentId = `${review.provider}:${review.providerReviewId}`;
    const canonicalId = canonicalByFingerprint.get(fingerprint);

    if (canonicalId) duplicateOf.set(currentId, canonicalId);
    else canonicalByFingerprint.set(fingerprint, currentId);
  }

  return duplicateOf;
}

function baseSignals(reviews: NormalizedReview[]): ReviewSignal[] {
  const rated = reviews.filter((review) => review.rating != null && !review.duplicateOf);
  if (!rated.length) return [];

  const positive = rated.filter((review) => (review.rating ?? 0) >= 4);
  const negative = rated.filter((review) => (review.rating ?? 5) <= 2);
  const sourceCount = new Set(rated.map((review) => review.sourceId)).size;
  const signals: ReviewSignal[] = [];

  if (positive.length) {
    signals.push({
      key: 'rating-positive',
      label: 'Positive rating signal',
      sentiment: 'positive',
      supportingReviewCount: positive.length,
      corpusShare: positive.length / rated.length,
      sourceCount,
      confidence: Math.min(1, positive.length / 25),
      evidenceIds: positive.slice(0, 50).map((review) => review.evidenceId),
    });
  }

  if (negative.length) {
    signals.push({
      key: 'rating-negative',
      label: 'Negative rating signal',
      sentiment: 'negative',
      supportingReviewCount: negative.length,
      corpusShare: negative.length / rated.length,
      sourceCount,
      confidence: Math.min(1, negative.length / 15),
      evidenceIds: negative.slice(0, 50).map((review) => review.evidenceId),
    });
  }

  return signals;
}

export class DeterministicReviewNormalizer implements ReviewNormalizer {
  async normalize(productId: string, reviews: RawReview[]): Promise<ReviewCorpus> {
    const usable = reviews.filter((review) => normalizeWhitespace(review.body).length > 0);
    const duplicates = deduplicate(usable);

    const normalized = usable.map((review) => {
      const item = normalizeReview(productId, review);
      item.duplicateOf = duplicates.get(item.id) ?? null;
      return item;
    });

    return {
      productId,
      reviews: normalized,
      signals: baseSignals(normalized),
    };
  }
}
