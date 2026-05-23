"use client";

import { useState, useEffect } from "react";
import type { NearbyReport, ReportStatus } from "@/types/database";

interface NearbyHelpfulCatsState {
  cats: NearbyReport[];
  searchRadius: number;
  expanded: boolean;
  exhausted: boolean;
  loading: boolean;
  error: string | null;
}

export function useNearbyHelpfulCats(
  location: { lat: number; lng: number } | null,
  statusFilter?: ReportStatus[]
): NearbyHelpfulCatsState {
  const [state, setState] = useState<NearbyHelpfulCatsState>({
    cats: [],
    searchRadius: 1,
    expanded: false,
    exhausted: false,
    loading: true,
    error: null,
  });

  const filterKey = statusFilter?.slice().sort().join(",") ?? "";

  useEffect(() => {
    if (!location) return;

    const params = new URLSearchParams({
      lat: location.lat.toString(),
      lng: location.lng.toString(),
    });
    if (statusFilter && statusFilter.length > 0) {
      params.set("status", statusFilter.join(","));
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    fetch(`/api/cats/nearby?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setState({
          cats: data.cats ?? [],
          searchRadius: data.radius ?? 1,
          expanded: data.expanded ?? false,
          exhausted: data.exhausted ?? false,
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false, error: "無法載入附近的貓" }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng, filterKey]);

  return state;
}
