// Claude API client — scoring and moderation via a single API call.
// Model: claude-sonnet-4-20250514

export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

const claudeApiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY!;

export async function scoreAndModerate(_imageBase64: string): Promise<never> {
  throw new Error('scoreAndModerate: not yet implemented');
  void claudeApiKey;
}
