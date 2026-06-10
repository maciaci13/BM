import type {
  KnowledgeEdge,
  KnowledgeEdgeType,
  KnowledgeNode,
  KnowledgeSubgraph,
  ProductKnowledgeGraph,
} from './contracts';

export class InMemoryKnowledgeGraph implements ProductKnowledgeGraph {
  private readonly nodes = new Map<string, KnowledgeNode>();
  private readonly edges = new Map<string, KnowledgeEdge>();

  async upsertNodes(nodes: KnowledgeNode[]): Promise<void> {
    for (const node of nodes) this.nodes.set(node.id, node);
  }

  async upsertEdges(edges: KnowledgeEdge[]): Promise<void> {
    for (const edge of edges) this.edges.set(edge.id, edge);
  }

  async getNode(id: string): Promise<KnowledgeNode | null> {
    return this.nodes.get(id) ?? null;
  }

  async neighbors(nodeId: string, edgeTypes?: KnowledgeEdgeType[]): Promise<KnowledgeSubgraph> {
    const edges = [...this.edges.values()].filter(
      (edge) =>
        (edge.from === nodeId || edge.to === nodeId) &&
        (!edgeTypes?.length || edgeTypes.includes(edge.type)),
    );

    const nodeIds = new Set<string>([nodeId]);
    for (const edge of edges) {
      nodeIds.add(edge.from);
      nodeIds.add(edge.to);
    }

    return {
      nodes: [...nodeIds]
        .map((id) => this.nodes.get(id))
        .filter((node): node is KnowledgeNode => Boolean(node)),
      edges,
    };
  }

  async findSimilarProducts(productId: string, limit = 10) {
    const targetEdges = [...this.edges.values()].filter(
      (edge) => edge.from === productId && ['contains', 'associated-with', 'supports'].includes(edge.type),
    );

    const targetFeatures = new Set(targetEdges.map((edge) => `${edge.type}:${edge.to}`));

    const candidates = [...this.nodes.values()].filter(
      (node) => node.type === 'product' && node.id !== productId,
    );

    return candidates
      .map((candidate) => {
        const candidateEdges = [...this.edges.values()].filter(
          (edge) => edge.from === candidate.id && ['contains', 'associated-with', 'supports'].includes(edge.type),
        );

        const candidateFeatures = new Set(
          candidateEdges.map((edge) => `${edge.type}:${edge.to}`),
        );

        const shared = [...targetFeatures].filter((feature) => candidateFeatures.has(feature));
        const union = new Set([...targetFeatures, ...candidateFeatures]).size;
        const score = union ? shared.length / union : 0;

        return {
          product: candidate,
          score: Number(score.toFixed(2)),
          sharedSignals: shared,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
