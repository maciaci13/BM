import type { MatchResult, MatchWarning } from '../../contracts/analysis';
import type { MatchScoringInput } from '../contracts';
import type { ScoringEngine } from '../interfaces';

export const MATCH_SCORE_VERSION = 'match-v1' as const;

export type MatchScoreBreakdown = {
  formulaFit: number;
  concernFit: number;
  sensitivityFit: number;
  similarUserOutcomes: number;
  routineFit: number;
};

export type MatchScoreResult = MatchResult & {
  version: typeof MATCH_SCORE_VERSION;
  breakdown: MatchScoreBreakdown;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toPercent(value: number): number {
  return Math.round(clamp(value) * 100);
}

function normalizedBreakdown(input: MatchScoringInput): MatchScoreBreakdown {
  return {
    formulaFit: clamp(input.formulaScore),
    concernFit: clamp(input.concernScore),
    sensitivityFit: clamp(input.sensitivityScore),
    similarUserOutcomes: clamp(input.similarUserOutcomeScore),
    routineFit: clamp(input.routineScore),
  };
}

function warningsFor(breakdown: MatchScoreBreakdown): MatchWarning[] {
  const warnings: MatchWarning[] = [];

  if (breakdown.sensitivityFit < 0.35) {
    warnings.push({
      reason: 'Low compatibility with the user sensitivity profile',
      level: 'avoid',
    });
  } else if (breakdown.sensitivityFit < 0.6) {
    warnings.push({
      reason: 'Some caution is warranted for the user sensitivity profile',
      level: 'caution',
    });
  }

  if (breakdown.formulaFit < 0.45) {
    warnings.push({
      reason: 'The formula has limited compatibility with the user profile',
      level: 'caution',
    });
  }

  if (breakdown.routineFit < 0.4) {
    warnings.push({
      reason: 'The product may conflict with the current routine',
      level: 'caution',
    });
  }

  return warnings;
}

function summaryFor(score: number, confidence: number): string {
  const scoreLabel = score >= 80 ? 'strong' : score >= 65 ? 'good' : score >= 45 ? 'mixed' : 'weak';
  const confidenceLabel = confidence >= 0.75 ? 'high' : confidence >= 0.5 ? 'moderate' : 'limited';
  return `This is a ${scoreLabel} match with ${confidenceLabel} evidence confidence.`;
}

function notesFor(breakdown: MatchScoreBreakdown): string[] {
  const entries: Array<[string, number]> = [
    ['Formula compatibility', breakdown.formulaFit],
    ['Concern relevance', breakdown.concernFit],
    ['Sensitivity compatibility', breakdown.sensitivityFit],
    ['Outcomes for similar users', breakdown.similarUserOutcomes],
    ['Routine compatibility', breakdown.routineFit],
  ];

  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => `${label}: ${toPercent(value)}%`);
}

export class DeterministicMatchEngine implements ScoringEngine {
  async score(input: MatchScoringInput): Promise<number> {
    const breakdown = normalizedBreakdown(input);
    const rawScore =
      breakdown.formulaFit * 0.35 +
      breakdown.concernFit * 0.2 +
      breakdown.sensitivityFit * 0.15 +
      breakdown.similarUserOutcomes * 0.2 +
      breakdown.routineFit * 0.1;

    return toPercent(rawScore);
  }

  async calculate(input: MatchScoringInput): Promise<MatchScoreResult> {
    const breakdown = normalizedBreakdown(input);
    const score = await this.score(input);
    const confidence = clamp(input.evidenceConfidence);

    return {
      version: MATCH_SCORE_VERSION,
      score,
      confidence,
      summary: summaryFor(score, confidence),
      warnings: warningsFor(breakdown),
      personalNotes: notesFor(breakdown),
      breakdown,
    };
  }
}
