import { haversineDistance } from "./haversine";

const MAX_RELAY_KM = 2.0;

type CanRelayResult =
  | { allowed: true }
  | { allowed: false; distanceKm: number; reason: string };

export function canRelay(
  userGps: { lat: number; lng: number },
  reportLocation: { lat: number; lng: number }
): CanRelayResult {
  const distance = haversineDistance(
    userGps.lat,
    userGps.lng,
    reportLocation.lat,
    reportLocation.lng
  );

  if (distance > MAX_RELAY_KM) {
    return {
      allowed: false,
      distanceKm: distance,
      reason: `你距離這隻貓 ${distance.toFixed(1)} 公里，超過 ${MAX_RELAY_KM} 公里範圍`,
    };
  }
  return { allowed: true };
}
