# BeautyMatch Review Intelligence Architecture v1

## Goal

Build a review and analysis brain that produces evidence-backed cosmetic insights without coupling the frontend to scraping providers, AI models or database tables.

The brain must distinguish between:
- discovered sources
- collected reviews
- normalized review records
- aggregated signals
- personalized interpretation
- generated explanation

An LLM may explain structured evidence, but must not be the system of record.

## Pipeline

```text
Product Resolution
  -> Source Discovery
  -> Review Ingestion
  -> Normalization & Deduplication
  -> Evidence Store
  -> Signal Extraction
  -> Confidence Scoring
  -> Personalization
  -> LLM Synthesis
```

## 1. Product resolution

Every analysis starts with a canonical product identity.

Required fields:
- canonical product id
- brand
- exact product name
- category
- barcode when available
- region / market
- size or variant when relevant
- formulation version
- normalized INCI

The resolver must prevent review mixing between:
- reformulations
- SPF and non-SPF versions
- tinted and untinted versions
- different strengths
- products sharing similar names
- regional formulations

Resolution output includes confidence and evidence.

## 2. Source discovery

Discovery locates possible review sources for the canonical product.

Provider interface:

```ts
interface ReviewDiscoveryProvider {
  discover(product: CanonicalProduct): Promise<DiscoveredReviewSource[]>;
}
```

Candidate source classes:
- Reddit threads and comments
- retailer product pages
- Amazon-compatible data providers
- beauty communities and forums
- YouTube transcript sources
- editorial pages only as secondary context

Search-based discovery is a fallback, not the primary review corpus.

Each discovered source records:
- source name
- source URL
- source product identifier
- estimated review count
- language / region
- access method
- discovery timestamp
- product-match confidence

## 3. Review ingestion

Ingestion providers collect individual review records where legally and technically allowed.

Provider interface:

```ts
interface ReviewIngestionProvider {
  ingest(source: DiscoveredReviewSource, cursor?: string): Promise<ReviewBatch>;
}
```

A raw review record should include:
- provider review id
- source product id
- rating
- title
- body
- review date
- author alias or hashed identifier
- verified purchase flag when available
- helpful-vote count
- variant
- country
- language
- claimed skin type / age / concerns when explicitly provided
- source URL
- collected timestamp

Raw provider payloads are stored separately from normalized records for auditability.

## 4. Normalization and deduplication

Normalization converts provider-specific data into one internal schema.

Required processing:
- text cleanup
- language detection
- rating normalization
- duplicate and near-duplicate detection
- syndicated-review detection
- spam and incentivized-review signals
- product-version validation
- PII minimization
- timestamp normalization

Duplicate detection should use provider ids, normalized hashes and semantic similarity.

## 5. Evidence store

Every claim shown to a user must be traceable to evidence records.

Evidence types:
- individual review
- review cluster
- ingredient source
- product-manufacturer source
- formulation source
- statistical aggregation

Evidence records are immutable snapshots with collection timestamps and source provenance.

The frontend receives evidence ids and safe source metadata, never raw provider internals.

## 6. Signal extraction

Signal extraction runs over the normalized corpus.

Signals include:
- positive and negative themes
- texture and finish
- irritation / breakouts / dryness / redness reports
- pilling and compatibility under makeup
- scent and packaging issues
- value perception
- usage duration
- repurchase intent
- skin-type-specific outcomes
- concern-specific outcomes
- adverse-event patterns

Signals must store:
- supporting review count
- corpus percentage
- source diversity
- recency
- evidence ids
- confidence

LLM extraction may be used, but results should be validated against deterministic counts and stored schemas.

## 7. Confidence scoring

A review insight confidence score is separate from product quality or user match.

Suggested confidence components:
- corpus size
- source diversity
- product resolution confidence
- formulation-version confidence
- review recency
- duplicate / spam rate
- agreement across sources
- availability of user attributes

Example weighted model:

```text
confidence =
  0.20 corpus_size_score +
  0.15 source_diversity_score +
  0.20 product_identity_score +
  0.15 formulation_match_score +
  0.10 recency_score +
  0.10 quality_score +
  0.10 cross_source_agreement_score
```

The score must be deterministic and versioned.

## 8. Personalization

Personalization operates on structured formula and review signals.

Inputs:
- skin type
- concerns
- allergies and sensitivities
- current routine
- prior reactions
- climate or region when relevant

Outputs:
- relevant positive signals
- relevant caution signals
- ingredient warnings
- uncertainty notes
- evidence ids

Personalization must not invent demographic matches when source reviews do not contain those attributes.

## 9. Match Score

The Match Score is not generated directly by an LLM.

It should combine independently versioned components:
- formula compatibility
- allergy / sensitivity compatibility
- concern relevance
- review outcomes for similar users
- routine compatibility
- evidence confidence

Example structure:

```text
match_score =
  0.35 formula_fit +
  0.20 concern_fit +
  0.15 sensitivity_fit +
  0.20 similar_user_outcomes +
  0.10 routine_fit
```

Low evidence confidence reduces certainty, not necessarily the product score. The UI should show both match and confidence.

## 10. LLM synthesis

The synthesis layer receives only structured inputs:
- canonical product
- normalized INCI analysis
- aggregated review signals
- personalization result
- confidence and evidence metadata

The LLM produces:
- concise summary
- plain-language explanation
- balanced pros and cons
- personalized notes
- explicit uncertainty

It may not invent review counts, URLs, ingredient facts or scores.

## 11. Storage model

Core entities:
- products
- product_variants
- product_formulations
- review_sources
- raw_reviews
- normalized_reviews
- review_clusters
- review_signals
- evidence_records
- analysis_jobs
- product_analyses
- personalization_results
- scoring_versions

## 12. Refresh strategy

Suggested refresh cadence:
- popular products: every 7-14 days
- medium-traffic products: every 30 days
- long-tail products: on demand, then every 60-90 days
- formulation data: recheck when source changes or discrepancy is detected

Use cursors and incremental ingestion where providers support it.

## 13. Privacy and compliance

- store the minimum author information required for deduplication
- hash or discard user identifiers
- retain source provenance and timestamps
- respect provider terms and robots / API restrictions
- support source deletion and reprocessing
- never expose private or removed review content

## 14. Provider strategy

Providers are adapters, not business logic.

Initial provider groups:
- Open Beauty Facts adapter for product candidates and INCI hints
- search discovery adapter for source discovery
- Reddit adapter where API access permits
- retailer adapters or licensed datasets
- paid review-data provider adapter for Amazon-scale coverage

The system should support multiple providers per source class and ranked fallbacks.

## 15. MVP phases

### Phase 1
- canonical product resolution
- Open Beauty Facts adapter
- search-based source discovery
- evidence schema
- structured review insight contract
- explicit corpus and confidence fields
- legacy AI fallback clearly labeled as limited evidence

### Phase 2
- first real ingestion provider
- normalized review storage
- deduplication
- theme extraction
- deterministic confidence score

### Phase 3
- multi-source corpus
- similar-user segmentation
- deterministic Match Score v1
- refresh jobs and monitoring

### Phase 4
- product comparison, dupes and alternatives based on formula plus review evidence
- longitudinal product and formulation tracking

## Non-negotiable rules

1. No frontend screen calls a scraper or AI provider directly.
2. No LLM-generated review count is accepted as fact.
3. No source is treated as the correct product without resolution confidence.
4. Every displayed claim can reference evidence.
5. Match Score and confidence are separate values.
6. Provider replacement must not change public frontend contracts.
