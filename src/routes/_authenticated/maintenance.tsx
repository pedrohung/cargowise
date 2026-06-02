import { Suspense, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, Package, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { maintenanceQueryOptions } from "@/hooks/useInventory";
import { vehiclesQueryOptions } from "@/hooks/useFleet";
import { MaintenanceRecord, MaintenanceStatus, deleteMaintenance } from "@/lib/maintenance.functions";
import { MaintenanceFormDialog } from "@/components/maintenance/MaintenanceFormDialog";
import { MaintenancePartsDialog } from "@/components/maintenance/MaintenancePartsDialog";

export const Route = createFileRoute("/_authenticated/maintenance")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(maintenanceQueryOptions),
      context.queryClient.ensureQueryData(vehiclesQueryOptions),
    ]),
  component: MaintenancePage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">No se pudo cargar: {error.message}</div>
  ),
});

const STATUS_LABEL: Record<MaintenanceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Programado", variant: "secondary" },
  in_progress: { label: "En curso", variant: "default" },
  completed: { label: "Completado", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const TYPE_LABEL: Record<string, string> = {
  preventive: "Preventivo", corrective: "Correctivo", inspection: "Inspección",
  oil_change: "Cambio de aceite", tire_change: "Neumáticos", other: "Otro",
};

function MaintenancePage() {
  const { data: records } = useSuspenseQuery(maintenanceQueryOptions);
  const { data: vehicles } = useSuspenseQuery(vehiclesQueryOptions);
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteMaintenance);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [partsTarget, setPartsTarget] = useState<MaintenanceRecord | null>(null);

  const vehicleLabel = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.plate} — ${v.brand ?? ""} ${v.model ?? ""}`.trim() : "—";
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Mantenimiento eliminado");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Agrupar por mes (calendario)
  const upcoming = records.filter((r) => r.status !== "completed" && r.status !== "cancelled");
  const byMonth = new Map<string, MaintenanceRecord[]>();
  for (const r of records) {
    const d = r.scheduled_date ?? r.completed_at?.slice(0, 10);
    if (!d) continue;
    const key = d.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(r);
  }
  const sortedMonths = Array.from(byMonth.keys()).sort().reverse();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mantenimiento</h1>
          <p className="text-sm text-muted-foreground">
            {records.length} registros · {upcoming.length} pendientes
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Nuevo mantenimiento
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-mono">
                <tr>
                  <th className="text-left px-4 py-2">Fecha</th>
                  <th className="text-left px-4 py-2">Vehículo</th>
                  <th className="text-left px-4 py-2">Tipo</th>
                  <th className="text-left px-4 py-2">Descripción</th>
                  <th className="text-left px-4 py-2">Estado</th>
                  <th className="text-right px-4 py-2">Costo</th>
                  <th className="text-right px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((r) => {
                  const d = r.scheduled_date ?? r.completed_at?.slice(0, 10);
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{d ?? "—"}</td>
                      <td className="px-4 py-2 font-medium">{vehicleLabel(r.vehicle_id)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{TYPE_LABEL[r.maintenance_type]}</td>
                      <td className="px-4 py-2 max-w-xs truncate">{r.description}</td>
                      <td className="px-4 py-2">
                        <Badge variant={STATUS_LABEL[r.status].variant}>{STATUS_LABEL[r.status].label}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{r.total_cost.toFixed(2)} {r.currency}</td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="ghost" size="icon" onClick={() => setPartsTarget(r)} title="Piezas">
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (confirm("¿Eliminar este mantenimiento?")) deleteMut.mutate(r.id);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Sin mantenimientos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4 space-y-6">
          {sortedMonths.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-12">Sin fechas programadas.</div>
          )}
          {sortedMonths.map((month) => {
            const items = byMonth.get(month)!.sort((a, b) =>
              (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""),
            );
            const monthDate = parseISO(`${month}-01`);
            return (
              <div key={month}>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold capitalize">
                    {format(monthDate, "MMMM yyyy", { locale: es })}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((r) => {
                    const d = r.scheduled_date ?? r.completed_at?.slice(0, 10);
                    return (
                      <button
                        key={r.id}
                        onClick={() => { setEditing(r); setFormOpen(true); }}
                        className="text-left rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {d ? format(parseISO(d), "d MMM", { locale: es }) : "—"}
                          </span>
                          <Badge variant={STATUS_LABEL[r.status].variant}>{STATUS_LABEL[r.status].label}</Badge>
                        </div>
                        <div className="font-medium text-sm">{vehicleLabel(r.vehicle_id)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {TYPE_LABEL[r.maintenance_type]} · {r.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      <MaintenanceFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} />
      {partsTarget && (
        <Suspense fallback={null}>
          <MaintenancePartsDialog
            open={!!partsTarget}
            onOpenChange={(v) => !v && setPartsTarget(null)}
            maintenanceId={partsTarget.id}
          />
        </Suspense>
      )}
    </div>
  );
}
