import type { ProductAnalysisResult } from '../../contracts/analysis';
import type { EvidenceRef } from '../../contracts/common';
import type { FormulaInsight } from '../../contracts/product';
import type { ReviewInsight } from '../../contracts/review';
import type { SkinProfile } from '../../contracts/profile';
import type {
  ProductResolutionInput,
  RawReview,
  ReviewCorpus,
  ReviewSignal,
} from '../contracts';
import type {
  ProductResolver,
  ReviewDiscoveryProvider,
  ReviewIngestionProvider,
  ReviewNormalizer,
} from '../interfaces';
import { DeterministicConfidenceEngine } from '../scoring/confidenceEngine';
import { DeterministicMatchEngine } from '../scoring/matchEngine';
import { DeterministicReviewSignalExtractor } from '../signals/reviewSignalExtractor';

export type FormulaAnalyzer = (input: {
  productId: string;
  ingredientsText?: string | null;
}) => Promise<FormulaInsight>;

export type PersonalizationScores = {
  formulaScore: number;
  concernScore: number;
  sensitivityScore: number;
  similarUserOutcomeScore: number;
  routineScore: number;
};

export type PersonalizationScorer = (input: {
  profile: SkinProfile;
  formula: FormulaInsight;
  corpus: ReviewCorpus;
  signals: ReviewSignal[];
}) => Promise<PersonalizationScores>;

export type ProductAnalysisOrchestratorDependencies = {
  resolver: ProductResolver;
  discoveryProviders: ReviewDiscoveryProvider[];
  ingestionProviders: Record<string, ReviewIngestionProvider>;
  normalizer: ReviewNormalizer;
  formulaAnalyzer: FormulaAnalyzer;
  personalizationScorer?: PersonalizationScorer;
  confidenceEngine?: DeterministicConfidenceEngine;
  matchEngine?: DeterministicMatchEngine;
  signalExtractor?: DeterministicReviewSignalExtractor;
};

export type ProductAnalysisOrchestratorInput = {
  product: ProductResolutionInput;
  ingredientsText?: string | null;
  profile?: SkinProfile | null;
};

function reviewInsightFrom(
  corpus: ReviewCorpus,
  signals: ReviewSignal[],
  confidence: number,
): ReviewInsight {
  const positiveSignals = signals.filter((signal) => signal.sentiment === 'positive');
  const negativeSignals = signals.filter((signal) => signal.sentiment === 'negative');
  const sourceCounts = new Map<string, number>();

  for (const review of corpus.reviews.filter((item) => !item.duplicateOf)) {
    sourceCounts.set(review.sourceId, (sourceCounts.get(review.sourceId) ?? 0) + 1);
  }

  return {
    corpusSize: corpus.reviews.filter((item) => !item.duplicateOf).length,
    sources: [...sourceCounts.entries()].map(([source, reviewCount]) => ({
      source,
      reviewCount,
    })),
    overallSummary: signals.length
      ? `Analysis found ${signals.length} recurring review signals.`
      : 'Not enough structured review evidence was found.',
    pros: positiveSignals.slice(0, 5).map((signal) => signal.label),
    cons: negativeSignals.slice(0, 5).map((signal) => signal.label),
    positiveThemes: positiveSignals.slice(0, 8).map((signal) => ({
      theme: signal.label,
      sentiment: signal.sentiment,
      frequency: signal.supportingReviewCount,
    })),
    negativeThemes: negativeSignals.slice(0, 8).map((signal) => ({
      theme: signal.label,
      sentiment: signal.sentiment,
      frequency: signal.supportingReviewCount,
    })),
    confidence,
    evidenceIds: [...new Set(signals.flatMap((signal) => signal.evidenceIds))],
  };
}

function evidenceFromRawReviews(reviews: RawReview[]): EvidenceRef[] {
  return reviews.map((review) => ({
    id: `review:${review.provider}:${review.providerReviewId}`,
    source: review.provider,
    title: review.title ?? undefined,
    url: review.sourceUrl ?? undefined,
    capturedAt: review.collectedAt,
  }));
}

export class ProductAnalysisOrchestrator {
  private readonly confidenceEngine: DeterministicConfidenceEngine;
  private readonly matchEngine: DeterministicMatchEngine;
  private readonly signalExtractor: DeterministicReviewSignalExtractor;

  constructor(private readonly deps: ProductAnalysisOrchestratorDependencies) {
    this.confidenceEngine = deps.confidenceEngine ?? new DeterministicConfidenceEngine();
    this.matchEngine = deps.matchEngine ?? new DeterministicMatchEngine();
    this.signalExtractor = deps.signalExtractor ?? new DeterministicReviewSignalExtractor();
  }

  async analyze(input: ProductAnalysisOrchestratorInput): Promise<ProductAnalysisResult> {
    const resolution = await this.deps.resolver.resolve(input.product);
    const product = resolution.product;

    const discoveredGroups = await Promise.all(
      this.deps.discoveryProviders.map((provider) => provider.discover(product)),
    );
    const discoveredSources = discoveredGroups.flat();

    const reviewBatches = await Promise.all(
      discoveredSources.map(async (source) => {
        const provider = this.deps.ingestionProviders[source.provider];
        if (!provider) return { reviews: [], complete: true };
        return provider.ingest(source);
      }),
    );
    const rawReviews = reviewBatches.flatMap((batch) => batch.reviews);

    const corpus = await this.deps.normalizer.normalize(product.id, rawReviews);
    const signals = this.signalExtractor.extract(corpus);
    const confidence = this.confidenceEngine.calculate(product, corpus);
    const formula = await this.deps.formulaAnalyzer({
      productId: product.id,
      ingredientsText: input.ingredientsText,
    });

    const reviews = reviewInsightFrom(corpus, signals, confidence.score);
    const evidence = [
      ...resolution.evidence,
      ...evidenceFromRawReviews(rawReviews),
    ];

    let match;
    if (input.profile && this.deps.personalizationScorer) {
      const scores = await this.deps.personalizationScorer({
        profile: input.profile,
        formula,
        corpus,
        signals,
      });

      match = await this.matchEngine.calculate({
        product,
        profile: input.profile,
        formulaScore: scores.formulaScore,
        concernScore: scores.concernScore,
        sensitivityScore: scores.sensitivityScore,
        similarUserOutcomeScore: scores.similarUserOutcomeScore,
        routineScore: scores.routineScore,
        evidenceConfidence: confidence.score,
      });
    }

    return {
      product,
      formula,
      reviews,
      match,
      evidence,
      generatedAt: new Date().toISOString(),
    };
  }
}
