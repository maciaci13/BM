import type {
  CanonicalProduct,
  DiscoveredReviewSource,
  IntelligenceAnalysis,
  MatchScoringInput,
  ProductResolutionInput,
  ProductResolutionResult,
  RawReview,
  ReviewBatch,
  ReviewCorpus,
} from './contracts';
import type { EvidenceRef } from '../contracts/common';

export interface ProductResolver {
  resolve(input: ProductResolutionInput): Promise<ProductResolutionResult>;
}

export interface ReviewDiscoveryProvider {
  discover(product: CanonicalProduct): Promise<DiscoveredReviewSource[]>;
}

export interface ReviewIngestionProvider {
  ingest(source: DiscoveredReviewSource, cursor?: string): Promise<ReviewBatch>;
}

export interface ReviewNormalizer {
  normalize(productId: string, reviews: RawReview[]): Promise<ReviewCorpus>;
}

export interface EvidenceRepository {
  saveEvidence(records: EvidenceRef[]): Promise<void>;
  getEvidence(ids: string[]): Promise<EvidenceRef[]>;
}

export interface ScoringEngine {
  score(input: MatchScoringInput): Promise<number>;
}

export interface IntelligenceEngine {
  analyze(product: CanonicalProduct): Promise<IntelligenceAnalysis>;
}
