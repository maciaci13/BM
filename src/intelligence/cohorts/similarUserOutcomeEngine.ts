import type { SkinProfile } from '../../contracts/profile';
import type { ReviewCorpus, ReviewSignal } from '../contracts';

export const COHORT_ENGINE_VERSION = 'cohort-v1' as const;

export type SimilarUserOutcomeResult = {
  version: typeof COHORT_ENGINE_VERSION;
  score: number;
  confidence: number;
  matchedReviewCount: number;
  matchedSignals: ReviewSignal[];
  reasons: string[];
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalize(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function concernMatch(profile: SkinProfile, reviewConcerns: string[]): boolean {
  const wanted = new Set(profile.concerns.map(normalize));
  return reviewConcerns.some((concern) => wanted.has(normalize(concern)));
}

function reviewMatchesProfile(profile: SkinProfile, review: ReviewCorpus['reviews'][number]): boolean {
  const skinTypeMatches =
    Boolean(profile.skinType) &&
    Boolean(review.skinType) &&
    normalize(profile.skinType) === normalize(review.skinType);

  const concernsMatch = profile.concerns.length > 0 && concernMatch(profile, review.concerns);

  return skinTypeMatches || concernsMatch;
}

function weightedOutcomeScore(signals: ReviewSignal[]): number {
  if (!signals.length) return 0.5;

  let weighted = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const polarity = signal.sentiment === 'positive' ? 1 : signal.sentiment === 'negative' ? 0 : 0.5;
    const weight = Math.max(0.05, signal.confidence) * Math.max(1, signal.supportingReviewCount);
    weighted += polarity * weight;
    totalWeight += weight;
  }

  return totalWeight ? clamp(weighted / totalWeight) : 0.5;
}

export class SimilarUserOutcomeEngine {
  calculate(profile: SkinProfile, corpus: ReviewCorpus, signals: ReviewSignal[]): SimilarUserOutcomeResult {
    const matchedReviews = corpus.reviews.filter(
      (review) => !review.duplicateOf && reviewMatchesProfile(profile, review),
    );

    const matchedEvidence = new Set(matchedReviews.map((review) => review.evidenceId));
    const matchedSignals = signals.filter((signal) =>
      signal.evidenceIds.some((id) => matchedEvidence.has(id)),
    );

    const score = weightedOutcomeScore(matchedSignals);
    const volumeScore = Math.min(1, matchedReviews.length / 30);
    const sourceCount = new Set(matchedReviews.map((review) => review.sourceId)).size;
    const diversityScore = Math.min(1, sourceCount / 3);
    const confidence = clamp(volumeScore * 0.7 + diversityScore * 0.3);

    const reasons: string[] = [];
    if (!matchedReviews.length) {
      reasons.push('No reviews with matching skin type or concerns were available');
    } else {
      reasons.push(`${matchedReviews.length} reviews matched the available user profile attributes`);
      reasons.push(`${sourceCount} source${sourceCount === 1 ? '' : 's'} contributed to the cohort`);
    }
    if (confidence < 0.5) reasons.push('The similar-user cohort is still too small for strong conclusions');

    return {
      version: COHORT_ENGINE_VERSION,
      score: Number(score.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      matchedReviewCount: matchedReviews.length,
      matchedSignals,
      reasons,
    };
  }
}
