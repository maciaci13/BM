import type { FormulaInsight, IngredientInsight, IngredientRisk } from '../../contracts/product';

export const FORMULA_ENGINE_VERSION = 'formula-v1' as const;

type IngredientRule = {
  names: RegExp[];
  role: string;
  risk: IngredientRisk;
  note: string;
  strength?: string;
  caution?: string;
};

const RULES: IngredientRule[] = [
  {
    names: [/\bniacinamide\b/i],
    role: 'Barrier support and tone-evening active',
    risk: 'low',
    note: 'Often supports barrier function and uneven tone; some sensitive users may react at higher concentrations.',
    strength: 'Barrier support and tone-evening potential',
  },
  {
    names: [/\bglycerin\b/i, /\bglycerol\b/i],
    role: 'Humectant',
    risk: 'low',
    note: 'Helps attract water into the outer skin layers.',
    strength: 'Hydration support',
  },
  {
    names: [/\bhyaluronic acid\b/i, /\bsodium hyaluronate\b/i, /\bhydrolyzed hyaluronic acid\b/i],
    role: 'Humectant',
    risk: 'low',
    note: 'Supports temporary hydration and plumping.',
    strength: 'Hydration and plumping support',
  },
  {
    names: [/\bceramide\b/i, /\bceramide np\b/i, /\bceramide ap\b/i, /\bceramide eop\b/i],
    role: 'Barrier lipid',
    risk: 'low',
    note: 'Supports the skin barrier when used in a balanced formula.',
    strength: 'Barrier repair support',
  },
  {
    names: [/\bsqualane\b/i],
    role: 'Emollient',
    risk: 'low',
    note: 'Lightweight emollient that can reduce moisture loss.',
    strength: 'Softening and barrier support',
  },
  {
    names: [/\bpanthenol\b/i],
    role: 'Humectant and soothing agent',
    risk: 'low',
    note: 'Commonly used for hydration and soothing support.',
    strength: 'Soothing and hydration support',
  },
  {
    names: [/\ballantoin\b/i],
    role: 'Soothing agent',
    risk: 'low',
    note: 'Commonly used to support comfort in irritated or dry-feeling skin.',
    strength: 'Soothing support',
  },
  {
    names: [/\bretinol\b/i, /\bretinal\b/i, /\bretinaldehyde\b/i, /\bretinyl palmitate\b/i],
    role: 'Retinoid active',
    risk: 'medium',
    note: 'Can support acne, texture and signs of aging, but may cause dryness or irritation.',
    strength: 'Texture, acne and age-support activity',
    caution: 'Potential irritation and routine conflicts with strong exfoliating acids',
  },
  {
    names: [/\bsalicylic acid\b/i],
    role: 'BHA exfoliant',
    risk: 'medium',
    note: 'Can help with clogged pores and oiliness but may dry or irritate sensitive skin.',
    strength: 'Pore-clearing and oil-control activity',
    caution: 'May increase dryness or irritation, especially with other strong actives',
  },
  {
    names: [/\bglycolic acid\b/i, /\blactic acid\b/i, /\bmandelic acid\b/i],
    role: 'AHA exfoliant',
    risk: 'medium',
    note: 'Supports exfoliation and texture but can irritate compromised or sensitive skin.',
    strength: 'Exfoliation and texture support',
    caution: 'Potential irritation and over-exfoliation risk',
  },
  {
    names: [/\bascorbic acid\b/i, /\b3-o-ethyl ascorbic acid\b/i, /\bascorbyl glucoside\b/i],
    role: 'Vitamin C antioxidant',
    risk: 'low',
    note: 'Can support antioxidant protection and uneven tone; acidic forms may sting sensitive skin.',
    strength: 'Antioxidant and tone-evening support',
  },
  {
    names: [/\bbenzoyl peroxide\b/i],
    role: 'Anti-acne active',
    risk: 'medium',
    note: 'Can reduce acne-causing bacteria but commonly causes dryness and irritation.',
    strength: 'Acne-control activity',
    caution: 'Dryness, irritation and fabric bleaching risk',
  },
  {
    names: [/\bfragrance\b/i, /\bparfum\b/i, /\baroma\b/i],
    role: 'Fragrance',
    risk: 'medium',
    note: 'Adds scent but may be problematic for fragrance-sensitive users.',
    caution: 'Potential concern for fragrance-sensitive or reactive skin',
  },
  {
    names: [/\blimonene\b/i, /\blinalool\b/i, /\bcitral\b/i, /\bgeraniol\b/i, /\beugenol\b/i],
    role: 'Fragrance allergen',
    risk: 'medium',
    note: 'Fragrance components that may trigger sensitive users.',
    caution: 'Potential fragrance-allergen exposure',
  },
  {
    names: [/\balcohol denat\.?\b/i, /\bsd alcohol\b/i],
    role: 'Solvent',
    risk: 'medium',
    note: 'Can improve feel and delivery but may increase dryness or stinging in reactive skin.',
    caution: 'Potential dryness or stinging depending on concentration and formula context',
  },
  {
    names: [/\bmineral oil\b/i, /\bpetrolatum\b/i],
    role: 'Occlusive',
    risk: 'low',
    note: 'Reduces water loss and supports barrier protection.',
    strength: 'Strong moisture-retention support',
  },
];

function splitInci(input?: string | null): string[] {
  if (!input?.trim()) return [];
  return input
    .split(/,(?![^()]*\))/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchRule(name: string): IngredientRule | undefined {
  return RULES.find((rule) => rule.names.some((pattern) => pattern.test(name)));
}

function inferRole(name: string): string {
  if (/water|aqua/i.test(name)) return 'Solvent';
  if (/oil|butter/i.test(name)) return 'Emollient';
  if (/extract/i.test(name)) return 'Botanical extract';
  if (/silicone|dimethicone|siloxane/i.test(name)) return 'Texture agent / emollient';
  if (/preserv|phenoxyethanol|benzoate|sorbate/i.test(name)) return 'Preservative';
  return 'Formula component';
}

function ingredientInsight(name: string): IngredientInsight {
  const rule = matchRule(name);
  return {
    inciName: name,
    role: rule?.role ?? inferRole(name),
    risk: rule?.risk ?? 'unknown',
    note: rule?.note,
    evidenceIds: [],
  };
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

export class DeterministicFormulaAnalyzer {
  async analyze(input: {
    productId: string;
    ingredientsText?: string | null;
  }): Promise<FormulaInsight> {
    const ingredients = splitInci(input.ingredientsText);
    const insights = ingredients.map(ingredientInsight);
    const matchedRules = ingredients.map(matchRule).filter((rule): rule is IngredientRule => Boolean(rule));
    const strengths = unique(matchedRules.map((rule) => rule.strength ?? ''));
    const cautions = unique(matchedRules.map((rule) => rule.caution ?? ''));

    const knownCount = insights.filter((ingredient) => ingredient.risk !== 'unknown').length;
    const confidence = ingredients.length
      ? Number(Math.min(1, 0.35 + knownCount / ingredients.length * 0.65).toFixed(2))
      : 0;

    const summary = ingredients.length
      ? `Formula parsed into ${ingredients.length} ingredients. ${knownCount} ingredients matched the current BeautyMatch knowledge rules.`
      : 'No ingredient list was available for deterministic formula analysis.';

    return {
      ingredients: insights,
      summary,
      strengths,
      cautions,
      confidence,
      evidenceIds: [],
    };
  }
}
