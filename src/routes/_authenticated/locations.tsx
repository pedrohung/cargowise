import { Suspense, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Plus,
  Star,
  Pencil,
  Trash2,
  Phone,
  Building2,
  Home,
  Warehouse,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  clientLocationsQueryOptions,
  municipalitiesQueryOptions,
  provincesQueryOptions,
} from "@/hooks/useGeography";
import {
  ClientLocation,
  deleteClientLocation,
} from "@/lib/geography.functions";
import { LocationFormDialog } from "@/components/geography/LocationFormDialog";

export const Route = createFileRoute("/_authenticated/locations")({
  head: () => ({
    meta: [
      { title: "Puntos de entrega — LogiCuba" },
      { name: "description", content: "Gestiona tus ubicaciones de carga y entrega en Cuba." },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(provincesQueryOptions),
      context.queryClient.ensureQueryData(municipalitiesQueryOptions),
      context.queryClient.ensureQueryData(clientLocationsQueryOptions),
    ]),
  component: LocationsPage,
});

const TYPE_META: Record<
  ClientLocation["location_type"],
  { label: string; icon: typeof Home }
> = {
  residential: { label: "Residencial", icon: Home },
  commercial: { label: "Comercial", icon: Building2 },
  warehouse: { label: "Almacén", icon: Warehouse },
  pickup_point: { label: "Recogida", icon: Package },
  other: { label: "Otro", icon: MapPin },
};

function LocationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LocationsContent />
    </Suspense>
  );
}

function LocationsContent() {
  const { data: locations } = useSuspenseQuery(clientLocationsQueryOptions);
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteClientLocation);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientLocation | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Punto eliminado");
      queryClient.invalidateQueries({ queryKey: ["client-locations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = locations.filter((l) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      l.label.toLowerCase().includes(q) ||
      l.address_line.toLowerCase().includes(q) ||
      l.province?.name.toLowerCase().includes(q) ||
      l.municipality?.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Geografía · Cuba
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Puntos de entrega</h1>
          <p className="text-muted-foreground mt-1">
            Tus ubicaciones guardadas para crear pedidos más rápido.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo punto
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por etiqueta, dirección, provincia, municipio…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <span className="font-mono text-xs text-muted-foreground">
          {filtered.length} / {locations.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 ring-1 ring-primary/30 grid place-items-center mb-4">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">
            {locations.length === 0 ? "Aún no tienes puntos guardados" : "Sin resultados"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {locations.length === 0
              ? "Crea tu primer punto de entrega para acelerar la creación de pedidos."
              : "Prueba con otra búsqueda."}
          </p>
          {locations.length === 0 && (
            <Button
              className="mt-6"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Crear primer punto
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((loc) => {
            const Icon = TYPE_META[loc.location_type].icon;
            return (
              <div
                key={loc.id}
                className="glass rounded-xl p-5 hover:border-primary/30 transition-colors group flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 shrink-0 rounded-md bg-primary/10 ring-1 ring-primary/20 grid place-items-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate flex items-center gap-1.5">
                        {loc.label}
                        {loc.is_favorite && (
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        )}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {TYPE_META[loc.location_type].label}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground flex-1 space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{loc.address_line}</span>
                  </div>
                  <div className="text-xs">
                    {loc.municipality?.name}, {loc.province?.name}
                  </div>
                  {loc.contact_phone && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Phone className="h-3 w-3" />
                      {loc.contact_phone}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setEditing(loc);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`¿Eliminar el punto "${loc.label}"?`)) {
                        deleteMutation.mutate(loc.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LocationFormDialog open={open} onOpenChange={setOpen} initial={editing} />
    </div>
  );
}
