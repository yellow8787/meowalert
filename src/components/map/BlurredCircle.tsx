"use client";

import { Circle } from "react-leaflet";

interface Props {
  lat: number;
  lng: number;
}

export function BlurredCircle({ lat, lng }: Props) {
  return (
    <Circle
      center={[lat, lng]}
      radius={150}
      pathOptions={{
        color: "#185FA5",
        fillColor: "#185FA5",
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: "6 4",
      }}
    />
  );
}
