import { ScoreResult } from '../types/scoring';

const API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are the P Spot AI scorer. You evaluate photos of outdoor pee spots and return a JSON score. You also moderate content — if the image contains nudity or private parts set moderation_pass to false and all scores to 0.

Return ONLY valid JSON, no markdown, no explanation:
{
  "moderation_pass": boolean,
  "score_view": number (0-25),
  "score_elevation": number (0-20),
  "score_remoteness": number (0-15),
  "score_lighting": number (0-10),
  "bonus_skyline": number (0-8),
  "bonus_sunrise": number (0 or 5),
  "bonus_wildlife": number (0-8),
  "bonus_girth": number (0-5),
  "bonus_hydration": number (0-5),
  "bonus_danger": number (0-8),
  "bonus_toilet": number (0-10),
  "bonus_effort": number (always 0),
  "wildlife_detected": boolean,
  "score_tier": string (one of: "Average Relief", "Decent Drainage", "Solid Stream", "Peak Performer", "Elite Peak Releaser", "Cascade Commander", "Legendary"),
  "ai_quote": string (one witty sentence about this specific spot, max 20 words),
  "score_total": number (sum of all scores, uncapped, no ceiling)
}`;

export async function scoreSpot(
  imageBase64: string,
  altitudeFt: number,
): Promise<ScoreResult> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
  if (!apiKey) throw new Error('Claude API key not configured.');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Score this P Spot submission. The photo was taken at approximately ${altitudeFt} feet elevation.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('[claude] API error:', response.status, body);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text: string = data?.content?.[0]?.text ?? '';

  try {
    const result: ScoreResult = JSON.parse(text);
    return result;
  } catch {
    console.error('[claude] Failed to parse JSON response:', text);
    throw new Error('Invalid response from AI scorer.');
  }
}
