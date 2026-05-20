import * as FileSystem from 'expo-file-system';
import * as exifr from 'exifr';
import { ExifData } from '../types/scoring';

/**
 * Extracts GPS and timestamp EXIF data from a local image URI.
 * Returns null if GPS data is absent (screenshot, generated image, etc).
 */
export async function extractExif(uri: string): Promise<ExifData | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as const,
    });

    // Decode base64 → Uint8Array so exifr can parse the raw bytes
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const gps = await exifr.gps(bytes);

    if (!gps || gps.latitude == null || gps.longitude == null) {
      return null;
    }

    // Try to get altitude and timestamp too
    const parsed = await exifr.parse(bytes, {
      gps: true,
      exif: true,
      tiff: true,
    });

    let altitudeFt: number | undefined;
    if (parsed?.GPSAltitude != null) {
      // GPSAltitude is in metres; convert to feet
      altitudeFt = Math.round(parsed.GPSAltitude * 3.28084);
    }

    let timestamp: string | undefined;
    if (parsed?.DateTimeOriginal) {
      timestamp = new Date(parsed.DateTimeOriginal).toISOString();
    } else if (parsed?.DateTime) {
      timestamp = new Date(parsed.DateTime).toISOString();
    }

    return {
      lat: gps.latitude,
      lng: gps.longitude,
      altitudeFt,
      timestamp,
    };
  } catch (err) {
    console.warn('[exif] Failed to parse EXIF:', err);
    return null;
  }
}
