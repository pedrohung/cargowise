import { Suspense, useEffect, useRef, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2, MapPin, Radio, Play, Square, Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  vehiclesQueryOptions, vehicleLocationsQueryOptions,
} from "@/hooks/useFleet";
import { recordVehiclePing } from "@/lib/fleet.functions";
import { TrackingMap, MapVehicle } from "@/components/tracking/TrackingMap";

export const Route = createFileRoute("/_authenticated/tracking")({
  head: () => ({
    meta: [
      { title: "Tracking GPS — LogiCuba" },
      { name: "description", content: "Posición en tiempo real de la flota." },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(vehiclesQueryOptions),
      context.queryClient.ensureQueryData(vehicleLocationsQueryOptions),
    ]),
  component: TrackingPage,
});

function TrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}

function TrackingContent() {
  const { data: vehicles } = useSuspenseQuery(vehiclesQueryOptions);
  const { data: locations } = useSuspenseQuery(vehicleLocationsQueryOptions);
  const { data: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const pingFn = useServerFn(recordVehiclePing);

  // realtime subscription to keep latest positions fresh
  useEffect(() => {
    const ch = supabase
      .channel("vehicle-locations-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vehicle_locations" },
        () => queryClient.invalidateQueries({ queryKey: ["vehicle-locations"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  // Driver: pick own vehicle and broadcast position
  const myVehicle = vehicles.find((v) => v.driver_id === me.userId);
  const [broadcastVehicleId, setBroadcastVehicleId] = useState<string>(myVehicle?.id ?? "");
  const [broadcasting, setBroadcasting] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const stopBroadcast = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setBroadcasting(false);
  };
  useEffect(() => () => stopBroadcast(), []);

  const startBroadcast = () => {
    if (!broadcastVehicleId) {
      toast.error("Selecciona un vehículo primero");
      return;
    }
    if (!("geolocation" in navigator)) {
      toast.error("Tu dispositivo no soporta geolocalización");
      return;
    }
    setBroadcasting(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await pingFn({
            data: {
              vehicle_id: broadcastVehicleId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              speed_kmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
              heading: pos.coords.heading ?? null,
              accuracy_m: pos.coords.accuracy ?? null,
            },
          });
        } catch (e) {
          console.error(e);
        }
      },
      (err) => {
        toast.error(`GPS: ${err.message}`);
        stopBroadcast();
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    toast.success("Transmitiendo posición");
  };

  const mapVehicles: MapVehicle[] = locations
    .map((l) => {
      const v = vehicles.find((vv) => vv.id === l.vehicle_id);
      return {
        vehicle_id: l.vehicle_id,
        plate: v?.plate,
        latitude: Number(l.latitude),
        longitude: Number(l.longitude),
        recorded_at: l.recorded_at,
        status: v?.status,
      };
    })
    .filter((v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <aside className="w-80 border-r border-border bg-card/40 overflow-y-auto">
        <div className="p-5 border-b border-border">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Tracking · En vivo
          </div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            Posiciones
            <Radio className={`h-3.5 w-3.5 ${broadcasting ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {mapVehicles.length} vehículo(s) con posición
          </p>
        </div>

        <div className="p-4 border-b border-border space-y-2 bg-muted/20">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Transmitir mi posición
          </div>
          <Select value={broadcastVehicleId} onValueChange={setBroadcastVehicleId} disabled={broadcasting}>
            <SelectTrigger><SelectValue placeholder="Selecciona vehículo" /></SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.plate}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {broadcasting ? (
            <Button variant="outline" className="w-full" onClick={stopBroadcast}>
              <Square className="h-3.5 w-3.5" /> Detener
            </Button>
          ) : (
            <Button className="w-full" onClick={startBroadcast}>
              <Play className="h-3.5 w-3.5" /> Compartir GPS
            </Button>
          )}
        </div>

        <div className="p-2 space-y-1">
          {mapVehicles.length === 0 ? (
            <div className="p-6 text-center">
              <MapPin className="h-5 w-5 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                Aún no hay vehículos transmitiendo.
              </p>
            </div>
          ) : (
            mapVehicles.map((v) => (
              <div
                key={v.vehicle_id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm font-medium">{v.plate ?? "—"}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-primary">
                    <Navigation className="h-3 w-3" />
                    {new Date(v.recorded_at).toLocaleTimeString("es-CU", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1 p-3">
        <TrackingMap vehicles={mapVehicles} className="h-full w-full" />
      </div>
    </div>
  );
}
