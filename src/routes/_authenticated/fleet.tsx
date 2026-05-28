import { Suspense, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Truck, Fuel, Pencil, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  vehiclesQueryOptions,
  driversQueryOptions,
  vehicleLocationsQueryOptions,
} from "@/hooks/useFleet";
import { Vehicle, deleteVehicle } from "@/lib/fleet.functions";
import { VehicleFormDialog } from "@/components/fleet/VehicleFormDialog";

export const Route = createFileRoute("/_authenticated/fleet")({
  head: () => ({
    meta: [
      { title: "Flota — LogiCuba" },
      { name: "description", content: "Gestión de vehículos y conductores." },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(vehiclesQueryOptions),
      context.queryClient.ensureQueryData(driversQueryOptions),
      context.queryClient.ensureQueryData(vehicleLocationsQueryOptions),
    ]),
  component: FleetPage,
});

const STATUS_META: Record<Vehicle["status"], { label: string; cls: string }> = {
  available:   { label: "Disponible",  cls: "bg-success/15 text-success ring-success/40" },
  in_route:    { label: "En ruta",     cls: "bg-primary/15 text-primary ring-primary/40" },
  maintenance: { label: "Taller",      cls: "bg-warning/15 text-warning ring-warning/40" },
  inactive:    { label: "Inactivo",    cls: "bg-muted text-muted-foreground ring-border" },
};

const TYPE_LABEL: Record<Vehicle["vehicle_type"], string> = {
  motorcycle: "Moto",
  car: "Auto",
  van: "Furgoneta",
  truck_small: "Camión ligero",
  truck_medium: "Camión medio",
  truck_large: "Camión pesado",
};

function FleetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FleetContent />
    </Suspense>
  );
}

function FleetContent() {
  const { data: vehicles } = useSuspenseQuery(vehiclesQueryOptions);
  const { data: drivers } = useSuspenseQuery(driversQueryOptions);
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteVehicle);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState("");

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Vehículo eliminado");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = vehicles.filter((v) =>
    [v.plate, v.brand, v.model].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Operaciones · Flota
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Vehículos</h1>
          <p className="text-muted-foreground mt-1">
            Tu flota disponible y conductores asignados.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Nuevo vehículo
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por placa, marca, modelo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <span className="font-mono text-xs text-muted-foreground">
          {filtered.length} / {vehicles.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 ring-1 ring-primary/30 grid place-items-center mb-4">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">
            {vehicles.length === 0 ? "Aún no hay vehículos" : "Sin resultados"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {vehicles.length === 0
              ? "Registra tu primer vehículo para asignarlo a pedidos."
              : "Prueba con otra búsqueda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => {
            const driver = drivers.find((d) => d.user_id === v.driver_id);
            return (
              <div key={v.id} className="glass rounded-xl p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono text-lg font-semibold tracking-wider">{v.plate}</div>
                    <div className="text-xs text-muted-foreground">
                      {[v.brand, v.model, v.year].filter(Boolean).join(" · ") || TYPE_LABEL[v.vehicle_type]}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] uppercase tracking-wider ring-1 ${STATUS_META[v.status].cls}`}>
                    <span className="h-1 w-1 rounded-full bg-current" />
                    {STATUS_META[v.status].label}
                  </span>
                </div>

                <dl className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <dt className="flex items-center gap-1.5"><Truck className="h-3 w-3" /> Tipo</dt>
                    <dd className="font-medium text-foreground">{TYPE_LABEL[v.vehicle_type]}</dd>
                  </div>
                  {v.capacity_kg != null && (
                    <div className="flex justify-between">
                      <dt>Capacidad</dt>
                      <dd className="font-medium text-foreground tabular-nums">
                        {Number(v.capacity_kg).toLocaleString("es-CU")} kg
                      </dd>
                    </div>
                  )}
                  {v.fuel_level != null && (
                    <div className="flex justify-between">
                      <dt className="flex items-center gap-1.5"><Fuel className="h-3 w-3" /> Combustible</dt>
                      <dd className="font-medium text-foreground">{v.fuel_level}%</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="flex items-center gap-1.5"><User className="h-3 w-3" /> Conductor</dt>
                    <dd className="font-medium text-foreground">
                      {driver?.full_name ?? <span className="text-muted-foreground">Sin asignar</span>}
                    </dd>
                  </div>
                </dl>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => { setEditing(v); setOpen(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`¿Eliminar el vehículo ${v.plate}?`)) deleteM.mutate(v.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VehicleFormDialog open={open} onOpenChange={setOpen} initial={editing} />
    </div>
  );
}
