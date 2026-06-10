import type { Language } from './common';

export type SkinConcernSeverity = 'mild' | 'moderate' | 'notable';

export type SkinConcern = {
  name: string;
  severity: SkinConcernSeverity;
  note?: string;
};

export type SkinProfile = {
  id?: string;
  displayName?: string | null;
  language: Language;
  skinType?: string | null;
  concerns: string[];
  allergies: string[];
  sensitivities?: string[];
  currentSkinAnalysis?: SkinAnalysisResult | null;
};

export type SkinAnalysisRequest = {
  frames: string[];
  notes?: string;
  language: Language;
};

export type SkinAnalysisResult = {
  skinType: string;
  concerns: SkinConcern[];
  observations: string[];
  recommendations: string[];
  summary: string;
  confidence?: number;
};
