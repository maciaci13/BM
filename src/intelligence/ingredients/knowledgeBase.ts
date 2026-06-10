import type { IngredientRisk } from '../../contracts/product';

export const INGREDIENT_KB_VERSION = 'ingredient-kb-v1' as const;

export type IngredientConcern =
  | 'acne'
  | 'dryness'
  | 'sensitivity'
  | 'redness'
  | 'hyperpigmentation'
  | 'barrier'
  | 'aging'
  | 'oiliness';

export type IngredientProfile = {
  id: string;
  canonicalName: string;
  aliases: string[];
  roles: string[];
  baseRisk: IngredientRisk;
  benefits: string[];
  cautions: string[];
  concernEffects: Partial<Record<IngredientConcern, number>>;
  interactionKeys: string[];
  evidenceIds: string[];
  version: typeof INGREDIENT_KB_VERSION;
};

export interface IngredientKnowledgeBase {
  findByName(name: string): IngredientProfile | null;
  findMany(names: string[]): IngredientProfile[];
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

const PROFILES: IngredientProfile[] = [
  {
    id: 'niacinamide',
    canonicalName: 'Niacinamide',
    aliases: ['nicotinamide', 'vitamin b3'],
    roles: ['barrier support', 'tone-evening active', 'sebum support'],
    baseRisk: 'low',
    benefits: ['Supports barrier function', 'May improve uneven tone', 'May support oil balance'],
    cautions: ['Higher concentrations may irritate some sensitive users'],
    concernEffects: { barrier: 0.9, hyperpigmentation: 0.75, oiliness: 0.65, sensitivity: 0.35 },
    interactionKeys: [],
    evidenceIds: [],
    version: INGREDIENT_KB_VERSION,
  },
  {
    id: 'glycerin',
    canonicalName: 'Glycerin',
    aliases: ['glycerol'],
    roles: ['humectant'],
    baseRisk: 'low',
    benefits: ['Supports hydration', 'Helps reduce dry-feeling skin'],
    cautions: [],
    concernEffects: { dryness: 0.9, barrier: 0.7 },
    interactionKeys: [],
    evidenceIds: [],
    version: INGREDIENT_KB_VERSION,
  },
  {
    id: 'salicylic-acid',
    canonicalName: 'Salicylic Acid',
    aliases: ['bha'],
    roles: ['bha exfoliant', 'pore-clearing active'],
    baseRisk: 'medium',
    benefits: ['Supports clogged pores', 'May help oily and acne-prone skin'],
    cautions: ['May increase dryness or irritation'],
    concernEffects: { acne: 0.9, oiliness: 0.8, dryness: -0.45, sensitivity: -0.45, redness: -0.3 },
    interactionKeys: ['strong-exfoliant'],
    evidenceIds: [],
    version: INGREDIENT_KB_VERSION,
  },
  {
    id: 'retinol',
    canonicalName: 'Retinol',
    aliases: ['vitamin a1'],
    roles: ['retinoid active'],
    baseRisk: 'medium',
    benefits: ['Supports acne, texture and signs of aging'],
    cautions: ['Commonly causes dryness or irritation during adaptation'],
    concernEffects: { acne: 0.8, aging: 0.9, hyperpigmentation: 0.7, dryness: -0.5, sensitivity: -0.5 },
    interactionKeys: ['retinoid'],
    evidenceIds: [],
    version: INGREDIENT_KB_VERSION,
  },
  {
    id: 'fragrance',
    canonicalName: 'Fragrance',
    aliases: ['parfum', 'aroma'],
    roles: ['fragrance'],
    baseRisk: 'medium',
    benefits: [],
    cautions: ['Potential concern for fragrance-sensitive or reactive skin'],
    concernEffects: { sensitivity: -0.6, redness: -0.4 },
    interactionKeys: ['fragrance'],
    evidenceIds: [],
    version: INGREDIENT_KB_VERSION,
  },
  {
    id: 'panthenol',
    canonicalName: 'Panthenol',
    aliases: ['provitamin b5', 'd-panthenol'],
    roles: ['humectant', 'soothing agent'],
    baseRisk: 'low',
    benefits: ['Supports hydration', 'May improve skin comfort'],
    cautions: [],
    concernEffects: { dryness: 0.8, barrier: 0.75, sensitivity: 0.55, redness: 0.45 },
    interactionKeys: [],
    evidenceIds: [],
    version: INGREDIENT_KB_VERSION,
  },
];

const INDEX = new Map<string, IngredientProfile>();
for (const profile of PROFILES) {
  INDEX.set(normalize(profile.canonicalName), profile);
  for (const alias of profile.aliases) INDEX.set(normalize(alias), profile);
}

export class InMemoryIngredientKnowledgeBase implements IngredientKnowledgeBase {
  findByName(name: string): IngredientProfile | null {
    return INDEX.get(normalize(name)) ?? null;
  }

  findMany(names: string[]): IngredientProfile[] {
    const found = names
      .map((name) => this.findByName(name))
      .filter((profile): profile is IngredientProfile => Boolean(profile));
    return [...new Map(found.map((profile) => [profile.id, profile])).values()];
  }
}
