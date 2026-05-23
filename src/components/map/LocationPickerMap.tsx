"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Map as LeafletMap } from "leaflet";

const PIN_ICON = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#185FA5;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface Props {
  initialLat?: number;
  initialLng?: number;
  onPick: (lat: number, lng: number) => void;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPickerMap({ initialLat = 25.0339, initialLng = 121.5645, onPick }: Props) {
  const [pin, setPin] = useState<[number, number] | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const handlePick = useCallback(
    (lat: number, lng: number) => {
      setPin([lat, lng]);
      onPick(lat, lng);
    },
    [onPick]
  );

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height: 220 }}>
      <p className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] text-xs bg-black/60 text-white px-2 py-1 rounded-full pointer-events-none">
        點擊地圖設定位置
      </p>
      <MapContainer
        ref={mapRef}
        center={[initialLat, initialLng]}
        zoom={15}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={handlePick} />
        {pin && <Marker position={pin} icon={PIN_ICON} />}
      </MapContainer>
    </div>
  );
}
