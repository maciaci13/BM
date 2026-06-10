import type { ReviewIngestionProvider } from '../interfaces';
import type { DiscoveredReviewSource, RawReview, ReviewBatch } from '../contracts';

export type ExternalReviewRecord = {
  id: string;
  rating?: number | null;
  title?: string | null;
  body: string;
  reviewDate?: string | null;
  authorId?: string | null;
  verifiedPurchase?: boolean | null;
  helpfulVotes?: number | null;
  variant?: string | null;
  country?: string | null;
  language?: string | null;
  url?: string | null;
};

export type ExternalReviewPage = {
  reviews: ExternalReviewRecord[];
  nextCursor?: string | null;
  complete?: boolean;
};

export type ReviewPageFetcher = (input: {
  source: DiscoveredReviewSource;
  cursor?: string;
}) => Promise<ExternalReviewPage>;

function hashAuthor(value?: string | null): string | null {
  if (!value) return null;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `author:${Math.abs(hash).toString(36)}`;
}

function mapReview(source: DiscoveredReviewSource, review: ExternalReviewRecord): RawReview {
  return {
    provider: source.provider,
    providerReviewId: review.id,
    sourceId: source.id,
    sourceProductId: source.sourceProductId ?? null,
    rating: review.rating ?? null,
    title: review.title ?? null,
    body: review.body,
    reviewDate: review.reviewDate ?? null,
    authorHash: hashAuthor(review.authorId),
    verifiedPurchase: review.verifiedPurchase ?? null,
    helpfulVotes: review.helpfulVotes ?? null,
    variant: review.variant ?? null,
    country: review.country ?? source.region ?? null,
    language: review.language ?? source.language ?? null,
    sourceUrl: review.url ?? source.url,
    collectedAt: new Date().toISOString(),
  };
}

export class JsonReviewIngestionProvider implements ReviewIngestionProvider {
  constructor(private readonly fetchPage: ReviewPageFetcher) {}

  async ingest(source: DiscoveredReviewSource, cursor?: string): Promise<ReviewBatch> {
    const page = await this.fetchPage({ source, cursor });
    const reviews = (page.reviews ?? [])
      .filter((review) => typeof review.body === 'string' && review.body.trim().length > 0)
      .map((review) => mapReview(source, review));

    return {
      reviews,
      nextCursor: page.nextCursor ?? null,
      complete: page.complete ?? !page.nextCursor,
    };
  }
}
