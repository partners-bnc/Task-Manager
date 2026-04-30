export const ATTENDANCE_LOCATION_UNAVAILABLE_TEXT = 'Location unavailable';
export const ATTENDANCE_GEOLOCATION_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 0,
});

const ATTENDANCE_LOCATION_STATUSES = new Set(['captured', 'denied', 'timeout', 'unsupported', 'failed']);

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function mapGeolocationErrorToStatus(error) {
  if (!error || typeof error.code !== 'number') {
    return 'failed';
  }

  if (error.code === 1) return 'denied';
  if (error.code === 3) return 'timeout';
  return 'failed';
}

export function normalizeAttendanceLocationStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ATTENDANCE_LOCATION_STATUSES.has(normalized) ? normalized : 'failed';
}

export function formatAttendanceCoordinateText(latitude, longitude) {
  const safeLatitude = toFiniteNumber(latitude);
  const safeLongitude = toFiniteNumber(longitude);

  if (safeLatitude === null || safeLongitude === null) {
    return ATTENDANCE_LOCATION_UNAVAILABLE_TEXT;
  }

  return `Lat ${safeLatitude.toFixed(4)}, Lng ${safeLongitude.toFixed(4)}`;
}

export async function captureAttendanceLocationPayload() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.geolocation) {
    return { locationStatus: 'unsupported' };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : undefined,
          locationStatus: 'captured',
        });
      },
      (error) => {
        resolve({
          locationStatus: mapGeolocationErrorToStatus(error),
        });
      },
      ATTENDANCE_GEOLOCATION_OPTIONS
    );
  });
}
