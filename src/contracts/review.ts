export type ReviewSource = {
  source: string;
  reviewCount: number;
  lastUpdated?: string;
};

export type ReviewTheme = {
  theme: string;
  sentiment: 'positive' | 'negative' | 'mixed';
  frequency?: number;
};

export type ReviewInsight = {
  corpusSize: number;
  sources: ReviewSource[];
  overallSummary: string;
  pros: string[];
  cons: string[];
  positiveThemes: ReviewTheme[];
  negativeThemes: ReviewTheme[];
  confidence: number;
  evidenceIds: string[];
};
