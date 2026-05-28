import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths in bundlers
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const truckIcon = L.divIcon({
  className: "",
  html: `<div style="background:oklch(0.72 0.17 158);width:18px;height:18px;border-radius:50%;border:3px solid oklch(0.13 0.02 250);box-shadow:0 0 0 2px oklch(0.72 0.17 158 / 0.4),0 0 14px oklch(0.72 0.17 158 / 0.7);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export type MapVehicle = {
  vehicle_id: string;
  plate?: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  status?: string;
};

function FitBounds({ vehicles }: { vehicles: MapVehicle[] }) {
  const map = useMap();
  useEffect(() => {
    if (vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map((v) => [v.latitude, v.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [vehicles, map]);
  return null;
}

interface Props {
  vehicles: MapVehicle[];
  className?: string;
}

export function TrackingMap({ vehicles, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Cuba center default
  const center: [number, number] = [21.5218, -77.7812];

  return (
    <div ref={ref} className={className}>
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", borderRadius: 12, background: "#0b1220" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {vehicles.map((v) => (
          <Marker
            key={v.vehicle_id}
            position={[v.latitude, v.longitude]}
            icon={truckIcon}
          >
            <Popup>
              <div className="text-xs font-mono">
                <div className="font-semibold">{v.plate ?? v.vehicle_id.slice(0, 8)}</div>
                <div className="opacity-70">
                  {new Date(v.recorded_at).toLocaleTimeString("es-CU")}
                </div>
                {v.status && <div className="mt-1">{v.status}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds vehicles={vehicles} />
      </MapContainer>
    </div>
  );
}
