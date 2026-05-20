import { ScoreResult } from '../types/scoring';

export interface MetricItem {
  label: string;
  value: number;
  max: number;
  emoji: string;
}

export function getMetrics(scoreResult: ScoreResult): MetricItem[] {
  return [
    { label: 'View Quality',   value: scoreResult.score_view,       max: 25, emoji: '🏔️' },
    { label: 'Elevation',      value: scoreResult.score_elevation,  max: 20, emoji: '⛰️' },
    { label: 'Remoteness',     value: scoreResult.score_remoteness, max: 15, emoji: '🌲' },
    { label: 'Lighting',       value: scoreResult.score_lighting,   max: 10, emoji: '🌅' },
    { label: 'Danger',         value: scoreResult.bonus_danger,     max: 8,  emoji: '⚡' },
    { label: 'Hydration',      value: scoreResult.bonus_hydration,  max: 5,  emoji: '💧' },
    { label: 'Skyline',        value: scoreResult.bonus_skyline,    max: 8,  emoji: '🌆' },
    { label: 'Wildlife',       value: scoreResult.bonus_wildlife,   max: 8,  emoji: '🦅' },
    { label: 'Stream',         value: scoreResult.bonus_girth,      max: 5,  emoji: '💦' },
    { label: 'Sunrise/Sunset', value: scoreResult.bonus_sunrise,   max: 5,  emoji: '🌄' },
  ];
}

export function getTop3Metrics(scoreResult: ScoreResult): MetricItem[] {
  return getMetrics(scoreResult)
    .filter((m) => m.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
}

export function buildShareMessage(scoreResult: ScoreResult, shareToken: string): string {
  const top3 = getTop3Metrics(scoreResult);
  const metricLines = top3.map((m) => `${m.emoji} ${m.label}: ${m.value}/${m.max}`);
  return [
    'P SPOT RECEIPT 🧾',
    '―――――――――――――',
    `Score: ${scoreResult.score_total}`,
    `Tier: ${scoreResult.score_tier}`,
    ...metricLines,
    '―――――――――――――',
    'Every great piss deserves a score.',
    `https://pspot.app/spot/${shareToken}`,
  ].join('\n');
}
