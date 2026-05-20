/* eslint-disable @typescript-eslint/no-require-imports */
import type MapboxGLType from '@rnmapbox/maps';

// @rnmapbox/maps requires a native dev build — it is not available in Expo Go.
// Guard the require() so the app doesn't crash during development with Expo Go.
let MapboxGL: typeof MapboxGLType | null = null;

try {
  MapboxGL = require('@rnmapbox/maps').default as typeof MapboxGLType;
  MapboxGL!.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');
} catch {
  console.warn(
    '[mapbox] Native module not available. Map features require a development build. ' +
    'Run: eas build --profile development --platform ios',
  );
}

export default MapboxGL;
