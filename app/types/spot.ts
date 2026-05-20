import { Privacy } from './scoring';

export interface Spot {
  id: string;
  user_id: string;
  image_url: string;
  share_token: string;
  privacy: Privacy;
  lat: number;
  lng: number;
  altitude_ft: number | null;
  location_name: string | null;
  score_total: number;
  score_view: number;
  score_elevation: number;
  score_remoteness: number;
  score_lighting: number;
  score_tier: string;
  bonus_skyline: number;
  bonus_sunrise: number;
  bonus_wildlife: number;
  bonus_girth: number;
  bonus_hydration: number;
  bonus_danger: number;
  bonus_toilet: number;
  bonus_effort: number;
  ai_quote: string | null;
  wildlife_detected: boolean;
  pee_detected: boolean | null;
  strava_activity_id: number | null;
  strava_distance_mi: number | null;
  strava_elevation_ft: number | null;
  strava_duration_sec: number | null;
  strava_suffer_score: number | null;
  shake_count: number;
  drip_count: number;
  moderation_pass: boolean;
  submitted_at: string;
}

export interface SpotProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Drip {
  id: string;
  user_id: string;
  spot_id: string;
  body: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  } | null;
}
