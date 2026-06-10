export const API_VERSION = 'v1' as const;

export type ApiVersion = typeof API_VERSION;
export type Language = 'bg' | 'en';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type EvidenceRef = {
  id: string;
  source: string;
  url?: string;
  title?: string;
  capturedAt?: string;
};

export type ApiError = {
  code: string;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
};
