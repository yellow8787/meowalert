export interface Hospital {
  place_id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  phone: string | null;
  rating: number | null;
  user_ratings_total: number;
  open_now: boolean | null;
  is_24h: boolean;
  google_maps_url: string;
  distance_m: number;
}

function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlace(place: any, userLat: number, userLng: number): Hospital {
  const lat: number = place.location?.latitude ?? 0;
  const lng: number = place.location?.longitude ?? 0;

  // New Places API uses regularOpeningHours for standard hours
  const openingHours = place.regularOpeningHours ?? place.currentOpeningHours ?? null;
  const descriptions: string[] = openingHours?.weekdayDescriptions ?? [];
  const is_24h = descriptions.some((d: string) =>
    d.includes("24 小時") || d.toLowerCase().includes("24 hours") || d.includes("0:00 – 0:00")
  );

  return {
    place_id: place.id ?? "",
    name: place.displayName?.text ?? "未知醫院",
    address: place.formattedAddress ?? "",
    location: { lat, lng },
    phone: place.nationalPhoneNumber ?? null,
    rating: place.rating ?? null,
    user_ratings_total: place.userRatingCount ?? 0,
    open_now: openingHours?.openNow ?? null,
    is_24h,
    google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text ?? "")}&query_place_id=${place.id}`,
    distance_m: Math.round(haversineMeters(userLat, userLng, lat, lng)),
  };
}

export async function searchNearbyHospitals(
  lat: number,
  lng: number,
): Promise<Hospital[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  console.log("[Places] API key exists:", !!apiKey);
  console.log("[Places] API key length:", apiKey?.length);
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY 未設定");

  const requestBody = {
    includedTypes: ["veterinary_care"],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 5000,
      },
    },
  };
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.rating",
    "places.userRatingCount",
    "places.regularOpeningHours",
    "places.location",
  ].join(",");

  console.log("[Places] Request:", JSON.stringify({ lat, lng, radius: 5000, requestBody }, null, 2));

  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(requestBody),
  });

  console.log("[Places] Response status:", res.status);
  const data = await res.json();
  console.log("[Places] Response body:", JSON.stringify(data, null, 2));

  if (!res.ok) {
    throw new Error(`Google Places API ${res.status}: ${JSON.stringify(data)}`);
  }

  const places: Hospital[] = (data.places ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => mapPlace(p, lat, lng)
  );

  return places.sort((a, b) => a.distance_m - b.distance_m);
}
