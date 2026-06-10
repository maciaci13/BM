import type { ProductLookupCandidate } from '../../contracts/product';
import type {
  AlternativeProduct,
  ProductAnalysisRequest,
  ProductAnalysisResult,
  RoutineAnalysisRequest,
  RoutineAnalysisResult,
} from '../../contracts/analysis';
import type {
  SkinAnalysisRequest,
  SkinAnalysisResult,
  SkinProfile,
} from '../../contracts/profile';

export interface BeautyMatchClient {
  scanSkin(request: SkinAnalysisRequest): Promise<SkinAnalysisResult>;

  identifyProduct(input: {
    image: string;
    language: 'bg' | 'en';
  }): Promise<ProductLookupCandidate[]>;

  analyzeProduct(request: ProductAnalysisRequest): Promise<ProductAnalysisResult>;

  findAlternatives(input: {
    productId?: string;
    profile?: SkinProfile | null;
    language: 'bg' | 'en';
  }): Promise<AlternativeProduct[]>;

  analyzeRoutine(request: RoutineAnalysisRequest): Promise<RoutineAnalysisResult>;
}
