export type KnowledgeNodeType =
  | 'product'
  | 'ingredient'
  | 'concern'
  | 'review-signal'
  | 'skin-type'
  | 'category';

export type KnowledgeNode = {
  id: string;
  type: KnowledgeNodeType;
  label: string;
  metadata?: Record<string, unknown>;
};

export type KnowledgeEdgeType =
  | 'contains'
  | 'supports'
  | 'may-aggravate'
  | 'associated-with'
  | 'similar-to'
  | 'belongs-to'
  | 'suited-for';

export type KnowledgeEdge = {
  id: string;
  from: string;
  to: string;
  type: KnowledgeEdgeType;
  weight: number;
  confidence: number;
  evidenceIds: string[];
  metadata?: Record<string, unknown>;
};

export type KnowledgeSubgraph = {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
};

export interface ProductKnowledgeGraph {
  upsertNodes(nodes: KnowledgeNode[]): Promise<void>;
  upsertEdges(edges: KnowledgeEdge[]): Promise<void>;
  getNode(id: string): Promise<KnowledgeNode | null>;
  neighbors(nodeId: string, edgeTypes?: KnowledgeEdgeType[]): Promise<KnowledgeSubgraph>;
  findSimilarProducts(productId: string, limit?: number): Promise<Array<{
    product: KnowledgeNode;
    score: number;
    sharedSignals: string[];
  }>>;
}
