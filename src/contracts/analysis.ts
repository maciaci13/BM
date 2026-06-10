import type { EvidenceRef, Language } from './common';
import type { FormulaInsight, ProductIdentity } from './product';
import type { SkinProfile } from './profile';
import type { ReviewInsight } from './review';

export type MatchWarning = {
  ingredient?: string;
  reason: string;
  level: 'info' | 'caution' | 'avoid';
  evidenceIds?: string[];
};

export type MatchResult = {
  score: number;
  confidence: number;
  summary: string;
  warnings: MatchWarning[];
  personalNotes: string[];
};

export type ProductAnalysisRequest = {
  product: ProductIdentity;
  ingredientsText?: string | null;
  profile?: SkinProfile | null;
  language: Language;
};

export type ProductAnalysisResult = {
  id?: string;
  product: ProductIdentity;
  formula: FormulaInsight;
  reviews: ReviewInsight;
  match?: MatchResult;
  evidence: EvidenceRef[];
  generatedAt?: string;
};

export type AlternativeProduct = ProductIdentity & {
  similarity: number;
  basis: string;
  why: string;
};

export type RoutineProductInsight = {
  product: ProductIdentity;
  type: string;
  whatItDoes: string;
  fitForUser: string;
};

export type RoutineAnalysisRequest = {
  image: string;
  profile?: SkinProfile | null;
  language: Language;
};

export type RoutineAnalysisResult = {
  products: RoutineProductInsight[];
  orderAm: string[];
  orderPm: string[];
  conflicts: string[];
  advice: string[];
  summary: string;
};
