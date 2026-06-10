import type { EvidenceRef, Language } from './common';

export type ProductIdentity = {
  id?: string;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  variant?: string | null;
  region?: string | null;
  imageUrl?: string | null;
};

export type ProductLookupRequest = {
  query?: string;
  barcode?: string;
  image?: string;
  language: Language;
};

export type ProductLookupCandidate = ProductIdentity & {
  confidence: number;
  evidence?: EvidenceRef[];
};

export type IngredientRisk = 'low' | 'medium' | 'high' | 'unknown';

export type IngredientInsight = {
  inciName: string;
  displayName?: string;
  role?: string;
  risk: IngredientRisk;
  note?: string;
  evidenceIds?: string[];
};

export type FormulaInsight = {
  ingredients: IngredientInsight[];
  summary: string;
  strengths: string[];
  cautions: string[];
  confidence: number;
  evidenceIds: string[];
};
