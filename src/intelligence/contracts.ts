import type { EvidenceRef } from '../contracts/common';
import type { MatchResult } from '../contracts/analysis';
import type { ProductIdentity } from '../contracts/product';
import type { SkinProfile } from '../contracts/profile';
import type { ReviewInsight, ReviewTheme } from '../contracts/review';

export type CanonicalProduct = ProductIdentity & {
  id: string;
  category?: string | null;
  formulationVersion?: string | null;
  resolutionConfidence: number;
};

export type ProductResolutionInput = {
  name?: string;
  brand?: string | null;
  barcode?: string | null;
  image?: string;
  region?: string | null;
};

export type ProductResolutionResult = {
  product: CanonicalProduct;
  alternatives: CanonicalProduct[];
  evidence: EvidenceRef[];
};

export type DiscoveredReviewSource = {
  id: string;
  provider: string;
  sourceName: string;
  url: string;
  sourceProductId?: string | null;
  language?: string | null;
  region?: string | null;
  estimatedReviewCount?: number | null;
  productMatchConfidence: number;
  discoveredAt: string;
};

export type RawReview = {
  provider: string;
  providerReviewId: string;
  sourceId: string;
  sourceProductId?: string | null;
  rating?: number | null;
  title?: string | null;
  body: string;
  reviewDate?: string | null;
  authorHash?: string | null;
  verifiedPurchase?: boolean | null;
  helpfulVotes?: number | null;
  variant?: string | null;
  country?: string | null;
  language?: string | null;
  sourceUrl?: string | null;
  collectedAt: string;
  rawPayload?: unknown;
};

export type ReviewBatch = {
  reviews: RawReview[];
  nextCursor?: string | null;
  complete: boolean;
};

export type NormalizedReview = {
  id: string;
  productId: string;
  sourceId: string;
  rating?: number | null;
  title?: string | null;
  body: string;
  reviewDate?: string | null;
  language: string;
  country?: string | null;
  verifiedPurchase?: boolean | null;
  helpfulVotes?: number | null;
  skinType?: string | null;
  concerns: string[];
  duplicateOf?: string | null;
  qualityScore: number;
  evidenceId: string;
};

export type ReviewSignal = {
  key: string;
  label: string;
  sentiment: ReviewTheme['sentiment'];
  supportingReviewCount: number;
  corpusShare: number;
  sourceCount: number;
  confidence: number;
  evidenceIds: string[];
};

export type ReviewCorpus = {
  productId: string;
  reviews: NormalizedReview[];
  signals: ReviewSignal[];
};

export type MatchScoringInput = {
  product: CanonicalProduct;
  profile: SkinProfile;
  formulaScore: number;
  concernScore: number;
  sensitivityScore: number;
  similarUserOutcomeScore: number;
  routineScore: number;
  evidenceConfidence: number;
};

export type IntelligenceAnalysis = {
  product: CanonicalProduct;
  reviews: ReviewInsight;
  match?: MatchResult;
  evidence: EvidenceRef[];
};
