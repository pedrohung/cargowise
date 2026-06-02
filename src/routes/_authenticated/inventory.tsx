import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, ArrowUpDown, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { partsQueryOptions } from "@/hooks/useInventory";
import { Part, deletePart } from "@/lib/inventory.functions";
import { PartFormDialog } from "@/components/inventory/PartFormDialog";
import { StockMovementDialog } from "@/components/inventory/StockMovementDialog";

export const Route = createFileRoute("/_authenticated/inventory")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(partsQueryOptions),
  component: InventoryPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">No se pudo cargar: {error.message}</div>
  ),
});

const CATEGORY_LABEL: Record<string, string> = {
  engine: "Motor", tires: "Neumáticos", electrical: "Eléctrico",
  body: "Carrocería", fluids: "Fluidos", filters: "Filtros",
  brakes: "Frenos", suspension: "Suspensión",
  consumables: "Consumibles", other: "Otro",
};

function InventoryPage() {
  const { data: parts } = useSuspenseQuery(partsQueryOptions);
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deletePart);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [moveTarget, setMoveTarget] = useState<Part | null>(null);

  const filtered = parts.filter((p) =>
    [p.name, p.sku, p.location].some((v) => v?.toLowerCase().includes(search.toLowerCase())),
  );

  const lowStock = parts.filter((p) => p.is_active && p.stock <= p.min_stock).length;

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Pieza eliminada");
      queryClient.invalidateQueries({ queryKey: ["parts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            {parts.length} pieza{parts.length === 1 ? "" : "s"} · {lowStock} en stock bajo
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Nueva pieza
        </Button>
      </div>

      <Input
        placeholder="Buscar por nombre, SKU o ubicación…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-mono">
            <tr>
              <th className="text-left px-4 py-2">SKU</th>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Categoría</th>
              <th className="text-right px-4 py-2">Stock</th>
              <th className="text-right px-4 py-2">Costo</th>
              <th className="text-left px-4 py-2">Ubicación</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p) => {
              const low = p.stock <= p.min_stock;
              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{p.sku ?? "—"}</td>
                  <td className="px-4 py-2 font-medium">
                    {p.name}
                    {!p.is_active && <Badge variant="outline" className="ml-2">Inactiva</Badge>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{CATEGORY_LABEL[p.category]}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    <div className="inline-flex items-center gap-1">
                      {low && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      <span className={low ? "text-amber-500 font-semibold" : ""}>
                        {p.stock} {p.unit}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {p.unit_cost.toFixed(2)} {p.currency}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{p.location ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setMoveTarget(p)} title="Movimiento">
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm(`¿Eliminar ${p.name}?`)) deleteMut.mutate(p.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PartFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} />
      {moveTarget && (
        <StockMovementDialog
          open={!!moveTarget}
          onOpenChange={(v) => !v && setMoveTarget(null)}
          part={moveTarget}
        />
      )}
    </div>
  );
}
