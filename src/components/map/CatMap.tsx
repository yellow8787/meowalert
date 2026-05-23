"use client";

import { useRef, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import type { NearbyReport } from "@/types/database";
import { CatMarker } from "./CatMarker";
import { BlurredCircle } from "./BlurredCircle";

interface Props {
  userLat: number;
  userLng: number;
  cats: NearbyReport[];
  selectedId: string | null;
  onSelectCat: (id: string) => void;
}

function MapSync({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

function MapClickDismiss({ onDismiss }: { onDismiss: () => void }) {
  useMapEvents({ click: onDismiss });
  return null;
}

export function CatMap({ userLat, userLng, cats, selectedId, onSelectCat }: Props) {
  const selectedCat = cats.find((c) => c.id === selectedId) ?? null;
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <MapContainer
      ref={mapRef}
      center={[userLat, userLng]}
      zoom={14}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapSync lat={userLat} lng={userLng} />
      <MapClickDismiss onDismiss={() => onSelectCat("")} />

      {/* User location dot */}
      <CircleMarker
        center={[userLat, userLng]}
        radius={7}
        pathOptions={{
          color: "white",
          fillColor: "#185FA5",
          fillOpacity: 1,
          weight: 2,
        }}
      />

      {/* Blurred circle for selected cat */}
      {selectedCat && (
        <BlurredCircle
          lat={selectedCat.location_blurred_lat}
          lng={selectedCat.location_blurred_lng}
        />
      )}

      {/* Cat markers */}
      {cats.map((cat) => (
        <CatMarker
          key={cat.id}
          cat={cat}
          isSelected={cat.id === selectedId}
          onClick={() => onSelectCat(cat.id)}
        />
      ))}
    </MapContainer>
  );
}
