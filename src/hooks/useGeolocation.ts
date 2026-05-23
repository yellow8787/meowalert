"use client";

import { useState, useEffect } from "react";

/** 使用者拒絕或瀏覽器不支援 GPS 時，預設台北 101 */
const TAIPEI_101 = { lat: 25.0339, lng: 121.5645 };

interface GeolocationState {
  location: { lat: number; lng: number };
  accuracy: number | null;
  denied: boolean;
  loading: boolean;
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    location: TAIPEI_101,
    accuracy: null,
    denied: false,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, loading: false, denied: true }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
          denied: false,
          loading: false,
        });
      },
      () => {
        // 拒絕或逾時：使用台北 101 作為預設
        setState((s) => ({ ...s, loading: false, denied: true }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return state;
}
