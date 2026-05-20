import { ExifData } from '../types/scoring';

/**
 * Parses GPS + timestamp from the raw EXIF object returned by expo-image-picker
 * when launched with `exif: true`. Returns null if GPS coords are absent.
 *
 * expo-image-picker returns GPS in one of two forms depending on platform:
 *   - Decimal degrees directly (iOS newer): { GPSLatitude: number, GPSLongitude: number }
 *   - DMS arrays (some Android/older): { GPSLatitude: [d,m,s], GPSLatitudeRef: 'N'|'S', … }
 */
export function parseImagePickerExif(
  exif: Record<string, unknown>,
): ExifData | null {
  if (!exif) return null;

  let lat: number | null = null;
  let lng: number | null = null;

  const rawLat = exif.GPSLatitude;
  const rawLng = exif.GPSLongitude;
  const latRef = exif.GPSLatitudeRef as string | undefined;
  const lngRef = exif.GPSLongitudeRef as string | undefined;

  if (typeof rawLat === 'number' && typeof rawLng === 'number') {
    lat = rawLat;
    lng = rawLng;
  } else if (Array.isArray(rawLat) && Array.isArray(rawLng)) {
    lat = dmsToDecimal(rawLat as number[], latRef ?? 'N');
    lng = dmsToDecimal(rawLng as number[], lngRef ?? 'E');
  }

  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  let altitudeFt: number | undefined;
  if (typeof exif.GPSAltitude === 'number') {
    altitudeFt = Math.round(exif.GPSAltitude * 3.28084);
  }

  let timestamp: string | undefined;
  const dto = exif.DateTimeOriginal ?? exif.DateTime;
  if (typeof dto === 'string' && dto.length > 0) {
    // EXIF datetime format: "YYYY:MM:DD HH:MM:SS" → ISO
    timestamp = dto.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    try {
      timestamp = new Date(timestamp).toISOString();
    } catch {
      timestamp = undefined;
    }
  }

  return { lat, lng, altitudeFt, timestamp };
}

function dmsToDecimal(dms: number[], ref: string): number {
  const [degrees, minutes, seconds] = dms;
  const decimal = degrees + minutes / 60 + (seconds ?? 0) / 3600;
  return ref === 'S' || ref === 'W' ? -decimal : decimal;
}
