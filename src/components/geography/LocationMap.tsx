import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const DEFAULT_ICON = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DEFAULT_ICON;

interface Props {
  value: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
  center?: [number, number];
  className?: string;
}

function ClickPicker({ onChange }: { onChange: Props["onChange"] }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function LocationMap({ value, onChange, center, className }: Props) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<L.Map | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (ref.current && center && !value) {
      ref.current.setView(center, 9, { animate: true });
    }
  }, [center, value]);

  if (!mounted) {
    return (
      <div
        className={
          "h-full w-full rounded-lg bg-muted/30 grid place-items-center text-xs text-muted-foreground " +
          (className ?? "")
        }
      >
        Cargando mapa…
      </div>
    );
  }

  const initialCenter: [number, number] = value
    ? [value.lat, value.lng]
    : center ?? [21.5218, -77.7812];

  return (
    <div className={"relative overflow-hidden rounded-lg ring-1 ring-border " + (className ?? "")}>
      <MapContainer
        center={initialCenter}
        zoom={value ? 14 : 7}
        scrollWheelZoom
        className="h-full w-full"
        ref={(instance) => {
          ref.current = instance;
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickPicker onChange={onChange} />
        {value && <Marker position={[value.lat, value.lng]} />}
      </MapContainer>
      <div className="pointer-events-none absolute top-2 left-2 z-[1000] px-2 py-1 rounded-md bg-background/80 backdrop-blur text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border">
        Click en el mapa para fijar el punto
      </div>
    </div>
  );
}
