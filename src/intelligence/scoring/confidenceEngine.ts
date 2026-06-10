import type { CanonicalProduct, ReviewCorpus } from '../contracts';

export type ConfidenceBreakdown = {
  corpusSize: number;
  sourceDiversity: number;
  reviewQuality: number;
  duplicateHealth: number;
  productResolution: number;
  recency: number;
};

export type ConfidenceResult = {
  score: number;
  breakdown: ConfidenceBreakdown;
  reasons: string[];
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function corpusSizeScore(count: number): number {
  if (count <= 0) return 0;
  if (count >= 200) return 1;
  return clamp(Math.log10(count + 1) / Math.log10(201));
}

function sourceDiversityScore(sourceCount: number): number {
  if (sourceCount <= 0) return 0;
  if (sourceCount >= 5) return 1;
  return clamp(sourceCount / 5);
}

function averageQuality(corpus: ReviewCorpus): number {
  const usable = corpus.reviews.filter((review) => !review.duplicateOf);
  if (!usable.length) return 0;
  return clamp(usable.reduce((sum, review) => sum + review.qualityScore, 0) / usable.length);
}

function duplicateHealth(corpus: ReviewCorpus): number {
  if (!corpus.reviews.length) return 0;
  const duplicateCount = corpus.reviews.filter((review) => Boolean(review.duplicateOf)).length;
  return clamp(1 - duplicateCount / corpus.reviews.length);
}

function recencyScore(corpus: ReviewCorpus, now = new Date()): number {
  const dates = corpus.reviews
    .filter((review) => !review.duplicateOf && review.reviewDate)
    .map((review) => new Date(review.reviewDate as string))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (!dates.length) return 0.35;

  const averageAgeDays =
    dates.reduce((sum, date) => sum + Math.max(0, now.getTime() - date.getTime()), 0) /
    dates.length /
    86_400_000;

  if (averageAgeDays <= 180) return 1;
  if (averageAgeDays >= 1_825) return 0.2;
  return clamp(1 - (averageAgeDays - 180) / (1_825 - 180) * 0.8);
}

function reasonList(breakdown: ConfidenceBreakdown, corpus: ReviewCorpus): string[] {
  const reasons: string[] = [];
  const uniqueReviews = corpus.reviews.filter((review) => !review.duplicateOf).length;
  const sourceCount = new Set(corpus.reviews.map((review) => review.sourceId)).size;

  reasons.push(`${uniqueReviews} unique reviews across ${sourceCount} source${sourceCount === 1 ? '' : 's'}`);

  if (breakdown.corpusSize < 0.4) reasons.push('Small review corpus limits certainty');
  if (breakdown.sourceDiversity < 0.4) reasons.push('Most evidence comes from too few sources');
  if (breakdown.reviewQuality < 0.5) reasons.push('Review quality is mixed or weak');
  if (breakdown.duplicateHealth < 0.7) reasons.push('A meaningful share of reviews appears duplicated');
  if (breakdown.productResolution < 0.7) reasons.push('Exact product or formulation match is uncertain');
  if (breakdown.recency < 0.5) reasons.push('Much of the review evidence is older');

  return reasons;
}

export class DeterministicConfidenceEngine {
  calculate(product: CanonicalProduct, corpus: ReviewCorpus): ConfidenceResult {
    const sourceCount = new Set(corpus.reviews.map((review) => review.sourceId)).size;
    const uniqueReviewCount = corpus.reviews.filter((review) => !review.duplicateOf).length;

    const breakdown: ConfidenceBreakdown = {
      corpusSize: corpusSizeScore(uniqueReviewCount),
      sourceDiversity: sourceDiversityScore(sourceCount),
      reviewQuality: averageQuality(corpus),
      duplicateHealth: duplicateHealth(corpus),
      productResolution: clamp(product.resolutionConfidence),
      recency: recencyScore(corpus),
    };

    const score =
      breakdown.corpusSize * 0.25 +
      breakdown.sourceDiversity * 0.15 +
      breakdown.reviewQuality * 0.15 +
      breakdown.duplicateHealth * 0.1 +
      breakdown.productResolution * 0.25 +
      breakdown.recency * 0.1;

    return {
      score: Number(clamp(score).toFixed(2)),
      breakdown,
      reasons: reasonList(breakdown, corpus),
    };
  }
}
