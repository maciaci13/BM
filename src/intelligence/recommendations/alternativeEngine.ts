import type { MatchResult } from '../../contracts/analysis';
import type { ProductIdentity } from '../../contracts/product';
import type { SkinProfile } from '../../contracts/profile';
import type { KnowledgeEdge, KnowledgeNode, ProductKnowledgeGraph } from '../graph/contracts';

export const ALTERNATIVE_ENGINE_VERSION = 'alternatives-v1' as const;

export type AlternativeRecommendationInput = {
  productId: string;
  profile?: SkinProfile | null;
  avoidIngredientIds?: string[];
  avoidSignalIds?: string[];
  requireConcernIds?: string[];
  limit?: number;
};

export type AlternativeRecommendation = {
  version: typeof ALTERNATIVE_ENGINE_VERSION;
  product: ProductIdentity;
  score: number;
  reasons: string[];
  tradeoffs: string[];
  sharedSignals: string[];
  match?: MatchResult;
};

type ProductCandidate = {
  node: KnowledgeNode;
  similarity: number;
  sharedSignals: string[];
};

function nodeToProduct(node: KnowledgeNode): ProductIdentity {
  return {
    id: node.id,
    name: node.label,
    brand: typeof node.metadata?.brand === 'string' ? node.metadata.brand : null,
    barcode: typeof node.metadata?.barcode === 'string' ? node.metadata.barcode : null,
    imageUrl: typeof node.metadata?.imageUrl === 'string' ? node.metadata.imageUrl : null,
    category: typeof node.metadata?.category === 'string' ? node.metadata.category : null,
  } as ProductIdentity;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hasBlockedEdge(edges: KnowledgeEdge[], blockedIds: string[], edgeType: string): boolean {
  if (!blockedIds.length) return false;
  return edges.some((edge) => edge.type === edgeType && blockedIds.includes(edge.to));
}

function concernSupportScore(edges: KnowledgeEdge[], requiredConcernIds: string[]): number {
  if (!requiredConcernIds.length) return 0.5;
  const supported = edges.filter(
    (edge) => edge.type === 'supports' && requiredConcernIds.includes(edge.to),
  );
  return clamp(supported.reduce((sum, edge) => sum + edge.weight * edge.confidence, 0) / requiredConcernIds.length);
}

function reasonsFor(candidate: ProductCandidate, concernScore: number): string[] {
  const reasons = [`Shares ${candidate.sharedSignals.length} graph feature${candidate.sharedSignals.length === 1 ? '' : 's'} with the reference product`];
  if (candidate.similarity >= 0.5) reasons.push('Strong formula or outcome similarity');
  if (concernScore >= 0.6) reasons.push('Supports the requested skin concerns');
  return reasons;
}

function tradeoffsFor(candidateEdges: KnowledgeEdge[], avoidIngredientIds: string[], avoidSignalIds: string[]): string[] {
  const tradeoffs: string[] = [];
  const aggravating = candidateEdges.filter((edge) => edge.type === 'may-aggravate');
  if (aggravating.length) tradeoffs.push('Has at least one caution signal in the knowledge graph');
  if (hasBlockedEdge(candidateEdges, avoidIngredientIds, 'contains')) tradeoffs.push('Contains an ingredient the user wanted to avoid');
  if (hasBlockedEdge(candidateEdges, avoidSignalIds, 'associated-with')) tradeoffs.push('Associated with a signal the user wanted to avoid');
  return tradeoffs;
}

export class AlternativeRecommendationEngine {
  constructor(private readonly graph: ProductKnowledgeGraph) {}

  async recommend(input: AlternativeRecommendationInput): Promise<AlternativeRecommendation[]> {
    const similar = await this.graph.findSimilarProducts(input.productId, Math.max(input.limit ?? 5, 20));
    const recommendations: AlternativeRecommendation[] = [];

    for (const candidate of similar as ProductCandidate[]) {
      const subgraph = await this.graph.neighbors(candidate.node.id);
      const candidateEdges = subgraph.edges.filter((edge) => edge.from === candidate.node.id);

      if (hasBlockedEdge(candidateEdges, input.avoidIngredientIds ?? [], 'contains')) continue;
      if (hasBlockedEdge(candidateEdges, input.avoidSignalIds ?? [], 'associated-with')) continue;

      const concernScore = concernSupportScore(candidateEdges, input.requireConcernIds ?? []);
      const cautionPenalty = candidateEdges.some((edge) => edge.type === 'may-aggravate') ? 0.12 : 0;
      const score = clamp(candidate.similarity * 0.65 + concernScore * 0.35 - cautionPenalty);

      recommendations.push({
        version: ALTERNATIVE_ENGINE_VERSION,
        product: nodeToProduct(candidate.node),
        score: Number(score.toFixed(2)),
        reasons: reasonsFor(candidate, concernScore),
        tradeoffs: tradeoffsFor(candidateEdges, input.avoidIngredientIds ?? [], input.avoidSignalIds ?? []),
        sharedSignals: candidate.sharedSignals,
      });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit ?? 5);
  }
}
