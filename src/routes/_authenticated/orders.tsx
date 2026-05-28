import { Suspense, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2, Plus, Truck, MapPin, ArrowRight, Trash2,
  ChevronRight, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ordersQueryOptions } from "@/hooks/useOrders";
import { clientsQueryOptions } from "@/hooks/useClients";
import { vehiclesQueryOptions, driversQueryOptions } from "@/hooks/useFleet";
import { clientLocationsQueryOptions } from "@/hooks/useGeography";
import {
  Order, ORDER_STATUSES, OrderStatus, assignOrder, deleteOrder, updateOrderStatus,
} from "@/lib/orders.functions";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderFormDialog } from "@/components/orders/OrderFormDialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Pedidos — LogiCuba" },
      { name: "description", content: "Gestión de pedidos y envíos en tiempo real." },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(ordersQueryOptions),
      context.queryClient.ensureQueryData(clientsQueryOptions),
      context.queryClient.ensureQueryData(vehiclesQueryOptions),
      context.queryClient.ensureQueryData(driversQueryOptions),
      context.queryClient.ensureQueryData(clientLocationsQueryOptions),
    ]),
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}

const STATUS_FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "assigned", label: "Asignados" },
  { value: "in_transit", label: "En ruta" },
  { value: "delivered", label: "Entregados" },
  { value: "cancelled", label: "Cancelados" },
];

function OrdersContent() {
  const { data: orders } = useSuspenseQuery(ordersQueryOptions);
  const { data: drivers } = useSuspenseQuery(driversQueryOptions);
  const { data: vehicles } = useSuspenseQuery(vehiclesQueryOptions);
  const queryClient = useQueryClient();

  const statusFn = useServerFn(updateOrderStatus);
  const assignFn = useServerFn(assignOrder);
  const deleteFn = useServerFn(deleteOrder);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["orders"] });

  const updateStatusM = useMutation({
    mutationFn: (input: { id: string; status: OrderStatus }) => statusFn({ data: input }),
    onSuccess: () => { toast.success("Estado actualizado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const assignM = useMutation({
    mutationFn: (input: { id: string; driver_id: string | null; vehicle_id: string | null }) =>
      assignFn({ data: input }),
    onSuccess: () => { toast.success("Asignación guardada"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Pedido eliminado"); invalidate(); setSelected(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.client?.name.toLowerCase().includes(q) ||
      o.destination_address.toLowerCase().includes(q) ||
      o.origin_address.toLowerCase().includes(q)
    );
  });

  const driverName = (id: string | null) =>
    drivers.find((d) => d.user_id === id)?.full_name ?? "—";
  const vehiclePlate = (id: string | null) =>
    vehicles.find((v) => v.id === id)?.plate ?? "—";

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Operaciones · Pedidos
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground mt-1">
            Solicitudes de transporte en curso y completadas.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo pedido
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Buscar por número, cliente, dirección…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-1 rounded-md border border-border p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-2.5 py-1 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
                filter === f.value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {filtered.length} / {orders.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 ring-1 ring-primary/30 grid place-items-center mb-4">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">
            {orders.length === 0 ? "Aún no hay pedidos" : "Sin resultados"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length === 0
              ? "Crea tu primer pedido para empezar a operar."
              : "Ajusta los filtros o la búsqueda."}
          </p>
          {orders.length === 0 && (
            <Button className="mt-6" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Crear primer pedido
            </Button>
          )}
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Pedido</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Ruta</th>
                <th className="text-left px-4 py-3">Asignación</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-border hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => setSelected(o)}
                >
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-primary">{o.order_number}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("es-CU")}
                    </div>
                  </td>
                  <td className="px-4 py-3">{o.client?.name ?? "—"}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{o.origin_address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <ArrowRight className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate">{o.destination_address}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{driverName(o.driver_id)}</div>
                    <div className="font-mono text-muted-foreground">
                      {vehiclePlate(o.vehicle_id)}
                    </div>
                  </td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(o.total_cost).toLocaleString("es-CU")}
                    <span className="ml-1 text-[10px] font-mono text-muted-foreground">CUP</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OrderFormDialog open={open} onOpenChange={setOpen} />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-primary">{selected.order_number}</span>
                  <OrderStatusBadge status={selected.status} />
                </SheetTitle>
                <SheetDescription>{selected.client?.name}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5 text-sm">
                <div className="space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Ruta
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                      <span>{selected.origin_address}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-primary" />
                      <span>{selected.destination_address}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Asignación
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={selected.driver_id ?? "none"}
                      onValueChange={(v) =>
                        assignM.mutate({
                          id: selected.id,
                          driver_id: v === "none" ? null : v,
                          vehicle_id: selected.vehicle_id,
                        })
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Conductor" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin conductor</SelectItem>
                        {drivers.map((d) => (
                          <SelectItem key={d.user_id} value={d.user_id}>
                            {d.full_name ?? "Conductor"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selected.vehicle_id ?? "none"}
                      onValueChange={(v) =>
                        assignM.mutate({
                          id: selected.id,
                          driver_id: selected.driver_id,
                          vehicle_id: v === "none" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Vehículo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin vehículo</SelectItem>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.plate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Cambiar estado
                  </div>
                  <Select
                    value={selected.status}
                    onValueChange={(v) =>
                      updateStatusM.mutate({ id: selected.id, status: v as OrderStatus })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-border p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Pago
                    </div>
                    <div className="mt-1 font-medium">{selected.payment_method}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Total
                    </div>
                    <div className="mt-1 font-medium tabular-nums">
                      {Number(selected.total_cost).toLocaleString("es-CU")} CUP
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3 text-xs flex items-start gap-2">
                  <CalendarClock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Código de tracking público
                    </div>
                    <div className="font-mono text-primary mt-0.5">{selected.tracking_code}</div>
                  </div>
                </div>

                {selected.notes && (
                  <div className="rounded-lg border border-border p-3 text-xs">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Notas
                    </div>
                    <p className="mt-1 text-muted-foreground">{selected.notes}</p>
                  </div>
                )}

                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive w-full"
                  onClick={() => {
                    if (confirm(`¿Eliminar el pedido ${selected.order_number}?`)) {
                      deleteM.mutate(selected.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar pedido
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
