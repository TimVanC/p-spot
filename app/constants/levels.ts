export interface LevelTier {
  minLevel: number;
  maxLevel: number | null;
  title: string;
}

export const LEVELS: LevelTier[] = [
  { minLevel: 1,  maxLevel: 4,  title: 'Tiny Tinkler' },
  { minLevel: 5,  maxLevel: 9,  title: 'Stream Starter' },
  { minLevel: 10, maxLevel: 14, title: 'Tinkle Titan' },
  { minLevel: 15, maxLevel: 19, title: 'Pissmonger' },
  { minLevel: 20, maxLevel: 24, title: 'Whiz Kid' },
  { minLevel: 25, maxLevel: 29, title: 'The Releaser' },
  { minLevel: 30, maxLevel: 34, title: 'Flow Lord' },
  { minLevel: 35, maxLevel: 39, title: 'Arc Angel' },
  { minLevel: 40, maxLevel: 44, title: 'Cascade Commander' },
  { minLevel: 45, maxLevel: 49, title: 'Piss Prophet' },
  { minLevel: 50, maxLevel: null, title: 'The King Wizzard' },
];

export function getLevelName(level: number): string {
  for (const tier of LEVELS) {
    if (tier.maxLevel === null || level <= tier.maxLevel) {
      return tier.title;
    }
  }
  return 'The King Wizzard';
}
