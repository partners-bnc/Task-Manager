import {
  ATTENDANCE_LOCATION_UNAVAILABLE_TEXT,
  formatAttendanceCoordinateText,
  normalizeAttendanceLocationStatus,
} from '@/utils/attendance-location';

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatAccuracyText(accuracyMeters) {
  const safeAccuracy = toFiniteNumber(accuracyMeters);
  if (safeAccuracy === null || safeAccuracy <= 0) {
    return '';
  }

  return `±${Math.round(safeAccuracy)}m`;
}

function getFailureMessage(status) {
  if (status === 'denied') {
    return 'GPS denied by browser; location unavailable.';
  }
  if (status === 'timeout') {
    return 'GPS timed out before location capture completed.';
  }
  if (status === 'unsupported') {
    return 'Browser geolocation is not supported on this device.';
  }
  return 'Live location could not be captured for this swipe.';
}

export async function resolveAttendanceDoorAddress(payload = {}) {
  const latitude = toFiniteNumber(payload.latitude);
  const longitude = toFiniteNumber(payload.longitude);
  const accuracyMeters = toFiniteNumber(payload.accuracyMeters);
  const locationStatus = normalizeAttendanceLocationStatus(payload.locationStatus);

  if (latitude !== null && longitude !== null) {
    const coordinateText = formatAttendanceCoordinateText(latitude, longitude);
    const accuracyText = formatAccuracyText(accuracyMeters);

    return {
      doorAddress: accuracyText ? `${coordinateText} (${accuracyText})` : coordinateText,
      locationNote: accuracyText
        ? `Location captured via browser GPS with ${accuracyText} accuracy.`
        : 'Location captured via browser GPS.',
      warning: '',
      resolvedDoorAddress: accuracyText ? `${coordinateText} (${accuracyText})` : coordinateText,
    };
  }

  const failureMessage = getFailureMessage(locationStatus);
  return {
    doorAddress: ATTENDANCE_LOCATION_UNAVAILABLE_TEXT,
    locationNote: failureMessage,
    warning: 'Attendance saved, but live location could not be captured from this device.',
    resolvedDoorAddress: ATTENDANCE_LOCATION_UNAVAILABLE_TEXT,
  };
}
