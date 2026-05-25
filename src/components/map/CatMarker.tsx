"use client";

import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { NearbyReport, ReportStatus } from "@/types/database";

const STATUS_COLOR: Record<ReportStatus, string> = {
  need: "#E24B4A",
  pending: "#378ADD",
  rescued: "#97C459",
  lost: "#7F77DD",
  found: "#F97316",
  reunited: "#97C459",
  archived: "#9CA3AF",
};

function makeIcon(color: string, selected: boolean) {
  const size = selected ? 18 : 14;
  const border = selected ? 3 : 2;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;
      border-radius:50%;
      background:${color};
      border:${border}px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
      ${selected ? "outline:2px solid " + color + ";" : ""}
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

interface Props {
  cat: NearbyReport;
  isSelected: boolean;
  onClick: () => void;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  map.panTo([lat, lng], { animate: true });
  return null;
}

export function CatMarker({ cat, isSelected, onClick }: Props) {
  const color = STATUS_COLOR[cat.status as ReportStatus] ?? STATUS_COLOR.need;
  const icon = makeIcon(color, isSelected);

  return (
    <Marker
      position={[cat.location_blurred_lat, cat.location_blurred_lng]}
      icon={icon}
      eventHandlers={{ click: onClick }}
      zIndexOffset={isSelected ? 1000 : 0}
    >
      {isSelected && (
        <FlyTo
          lat={cat.location_blurred_lat}
          lng={cat.location_blurred_lng}
        />
      )}
      <Popup>
        <div className="text-sm font-medium">{cat.name}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {[cat.location_district, cat.location_city].filter(Boolean).join(" · ")}
        </div>
        <a
          href={`/cat/${cat.id}`}
          className="block mt-1.5 text-xs text-blue-600 hover:underline"
        >
          查看詳情 →
        </a>
      </Popup>
    </Marker>
  );
}
