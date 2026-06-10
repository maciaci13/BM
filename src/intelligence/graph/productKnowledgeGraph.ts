import type { ProductIdentity } from '../../contracts/product';
import type { ReviewSignal } from '../contracts';
import type { IngredientProfile, IngredientConcern } from '../ingredients/knowledgeBase';

export type ProductNode = {
  id: string;
  product: ProductIdentity;
};

export type IngredientNode = {
  id: string;
  ingredient: IngredientProfile;
};

export type SignalNode = {
  id: string;
  signal: ReviewSignal;
};

export type ConcernNode = {
  id: string;
  concern: IngredientConcern;
};

export type ProductIngredientEdge = {
  productId: string;
  ingredientId: string;
  position?: number;
  confidence: number;
};

export type ProductSignalEdge = {
  productId: string;
  signalId: string;
  confidence: number;
  evidenceIds: string[];
};

export type IngredientConcernEdge = {
  ingredientId: string;
  concernId: string;
  effect: number;
  evidenceIds: string[];
};

export interface ProductKnowledgeGraph {
  upsertProduct(node: ProductNode): Promise<void>;
  upsertIngredient(node: IngredientNode): Promise<void>;
  upsertSignal(node: SignalNode): Promise<void>;
  upsertConcern(node: ConcernNode): Promise<void>;

  linkProductIngredient(edge: ProductIngredientEdge): Promise<void>;
  linkProductSignal(edge: ProductSignalEdge): Promise<void>;
  linkIngredientConcern(edge: IngredientConcernEdge): Promise<void>;

  getProductIngredients(productId: string): Promise<ProductIngredientEdge[]>;
  getProductSignals(productId: string): Promise<ProductSignalEdge[]>;
  getIngredientConcerns(ingredientId: string): Promise<IngredientConcernEdge[]>;
}

export class InMemoryProductKnowledgeGraph implements ProductKnowledgeGraph {
  private readonly products = new Map<string, ProductNode>();
  private readonly ingredients = new Map<string, IngredientNode>();
  private readonly signals = new Map<string, SignalNode>();
  private readonly concerns = new Map<string, ConcernNode>();

  private readonly productIngredients: ProductIngredientEdge[] = [];
  private readonly productSignals: ProductSignalEdge[] = [];
  private readonly ingredientConcerns: IngredientConcernEdge[] = [];

  async upsertProduct(node: ProductNode): Promise<void> {
    this.products.set(node.id, node);
  }

  async upsertIngredient(node: IngredientNode): Promise<void> {
    this.ingredients.set(node.id, node);
  }

  async upsertSignal(node: SignalNode): Promise<void> {
    this.signals.set(node.id, node);
  }

  async upsertConcern(node: ConcernNode): Promise<void> {
    this.concerns.set(node.id, node);
  }

  async linkProductIngredient(edge: ProductIngredientEdge): Promise<void> {
    this.productIngredients.push(edge);
  }

  async linkProductSignal(edge: ProductSignalEdge): Promise<void> {
    this.productSignals.push(edge);
  }

  async linkIngredientConcern(edge: IngredientConcernEdge): Promise<void> {
    this.ingredientConcerns.push(edge);
  }

  async getProductIngredients(productId: string): Promise<ProductIngredientEdge[]> {
    return this.productIngredients.filter((edge) => edge.productId === productId);
  }

  async getProductSignals(productId: string): Promise<ProductSignalEdge[]> {
    return this.productSignals.filter((edge) => edge.productId === productId);
  }

  async getIngredientConcerns(ingredientId: string): Promise<IngredientConcernEdge[]> {
    return this.ingredientConcerns.filter((edge) => edge.ingredientId === ingredientId);
  }
}
