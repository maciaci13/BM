import type { NormalizedReview, ReviewCorpus, ReviewSignal } from '../contracts';

type SignalRule = {
  key: string;
  label: string;
  sentiment: 'positive' | 'negative' | 'mixed';
  patterns: RegExp[];
};

const RULES: SignalRule[] = [
  {
    key: 'irritation',
    label: 'Irritation or stinging',
    sentiment: 'negative',
    patterns: [/irritat/i, /stinging?/i, /burning?/i, /щип/i, /парен/i, /раздраз/i],
  },
  {
    key: 'redness',
    label: 'Redness',
    sentiment: 'negative',
    patterns: [/redness/i, /red face/i, /зачерв/i, /червен/i],
  },
  {
    key: 'dryness',
    label: 'Dryness or tightness',
    sentiment: 'negative',
    patterns: [/drying/i, /dried out/i, /tight skin/i, /flaky/i, /изсуш/i, /опъва/i, /лющ/i],
  },
  {
    key: 'breakouts',
    label: 'Breakouts or clogged pores',
    sentiment: 'negative',
    patterns: [/breakout/i, /acne/i, /clogged pores?/i, /comedone/i, /пъпк/i, /акне/i, /запуш.*пор/i],
  },
  {
    key: 'pilling',
    label: 'Pilling',
    sentiment: 'negative',
    patterns: [/pill(?:ing|s)?/i, /balls? up/i, /rolls? off/i, /рони/i, /топченца/i],
  },
  {
    key: 'hydration',
    label: 'Hydration',
    sentiment: 'positive',
    patterns: [/hydrat/i, /moistur/i, /plump/i, /хидрат/i, /овлажн/i],
  },
  {
    key: 'glow',
    label: 'Glow or radiance',
    sentiment: 'positive',
    patterns: [/glow/i, /radiant/i, /luminous/i, /сия/i, /блясък/i],
  },
  {
    key: 'makeup-compatibility',
    label: 'Works well under makeup',
    sentiment: 'positive',
    patterns: [/under makeup/i, /makeup sits well/i, /good primer/i, /под грим/i, /основа за грим/i],
  },
  {
    key: 'greasy-finish',
    label: 'Greasy or heavy finish',
    sentiment: 'negative',
    patterns: [/greasy/i, /oily finish/i, /too heavy/i, /мазн/i, /тежък/i],
  },
  {
    key: 'soothing',
    label: 'Soothing or calming',
    sentiment: 'positive',
    patterns: [/sooth/i, /calm(?:ing|ed)?/i, /успок/i, /намали.*зачерв/i],
  },
];

function reviewText(review: NormalizedReview): string {
  return `${review.title ?? ''} ${review.body}`.trim();
}

function signalForRule(rule: SignalRule, reviews: NormalizedReview[]): ReviewSignal | null {
  const usable = reviews.filter((review) => !review.duplicateOf && review.qualityScore >= 0.35);
  if (!usable.length) return null;

  const matched = usable.filter((review) => {
    const text = reviewText(review);
    return rule.patterns.some((pattern) => pattern.test(text));
  });

  if (!matched.length) return null;

  const sourceCount = new Set(matched.map((review) => review.sourceId)).size;
  const averageQuality = matched.reduce((sum, review) => sum + review.qualityScore, 0) / matched.length;
  const volumeScore = Math.min(1, matched.length / 20);
  const diversityScore = Math.min(1, sourceCount / 3);
  const confidence = Number((volumeScore * 0.5 + diversityScore * 0.25 + averageQuality * 0.25).toFixed(2));

  return {
    key: rule.key,
    label: rule.label,
    sentiment: rule.sentiment,
    supportingReviewCount: matched.length,
    corpusShare: matched.length / usable.length,
    sourceCount,
    confidence,
    evidenceIds: matched.slice(0, 100).map((review) => review.evidenceId),
  };
}

export class DeterministicReviewSignalExtractor {
  extract(corpus: ReviewCorpus): ReviewSignal[] {
    const extracted = RULES
      .map((rule) => signalForRule(rule, corpus.reviews))
      .filter((signal): signal is ReviewSignal => Boolean(signal));

    return [...corpus.signals, ...extracted].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.supportingReviewCount - a.supportingReviewCount;
    });
  }
}
