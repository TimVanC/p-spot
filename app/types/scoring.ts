export type Privacy = 'public' | 'streamers' | 'private';

export type ScoreTier =
  | 'Average Relief'
  | 'Decent Drainage'
  | 'Solid Stream'
  | 'Peak Performer'
  | 'Elite Peak Releaser'
  | 'Cascade Commander'
  | 'Legendary';

export interface ScoreResult {
  moderation_pass: boolean;
  score_view: number;
  score_elevation: number;
  score_remoteness: number;
  score_lighting: number;
  bonus_skyline: number;
  bonus_sunrise: number;
  bonus_wildlife: number;
  bonus_girth: number;
  bonus_hydration: number;
  bonus_danger: number;
  bonus_toilet: number;
  bonus_effort: number;
  wildlife_detected: boolean;
  pee_detected: boolean;
  score_tier: ScoreTier;
  ai_quote: string;
  score_total: number;
}

export interface ExifData {
  lat: number;
  lng: number;
  altitudeFt?: number;
  timestamp?: string;
}
