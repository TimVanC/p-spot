// Mapbox helpers — reverse geocoding, tile queries, etc.

export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN!;

export async function reverseGeocode(_lat: number, _lng: number): Promise<never> {
  throw new Error('reverseGeocode: not yet implemented');
}
