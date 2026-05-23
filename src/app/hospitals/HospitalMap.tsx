"use client";

import { useRef, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import type { Hospital } from "@/lib/google-places";
import "leaflet/dist/leaflet.css";

interface Props {
  userLat: number;
  userLng: number;
  hospitals: Hospital[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function MapSync({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

export default function HospitalMap({ userLat, userLng, hospitals, selectedId, onSelect }: Props) {
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

      {/* User position */}
      <CircleMarker
        center={[userLat, userLng]}
        radius={8}
        pathOptions={{ color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.9, weight: 2 }}
      />

      {hospitals.map((h) => (
        <CircleMarker
          key={h.place_id}
          center={[h.location.lat, h.location.lng]}
          radius={selectedId === h.place_id ? 12 : 9}
          pathOptions={{
            color: h.is_24h ? "#059669" : h.open_now ? "#16a34a" : "#9ca3af",
            fillColor: h.is_24h ? "#059669" : h.open_now ? "#16a34a" : "#9ca3af",
            fillOpacity: 0.85,
            weight: selectedId === h.place_id ? 3 : 2,
          }}
          eventHandlers={{ click: () => onSelect(h.place_id) }}
        >
          <Popup>
            <div className="text-sm font-medium">{h.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {h.is_24h ? "24 小時" : h.open_now ? "營業中" : "休息中"}
            </div>
            <a
              href={h.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline mt-1 block"
            >
              Google Maps 導航
            </a>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
