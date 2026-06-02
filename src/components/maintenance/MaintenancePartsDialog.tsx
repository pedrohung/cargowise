import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { addMaintenancePart, removeMaintenancePart } from "@/lib/maintenance.functions";
import { partsQueryOptions, maintenancePartsQueryOptions } from "@/hooks/useInventory";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenanceId: string;
}

export function MaintenancePartsDialog({ open, onOpenChange, maintenanceId }: Props) {
  const queryClient = useQueryClient();
  const { data: parts } = useSuspenseQuery(partsQueryOptions);
  const { data: items } = useSuspenseQuery(maintenancePartsQueryOptions(maintenanceId));
  const addFn = useServerFn(addMaintenancePart);
  const removeFn = useServerFn(removeMaintenancePart);

  const [partId, setPartId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const selectedPart = parts.find((p) => p.id === partId);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["maintenance-parts", maintenanceId] });
    queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    queryClient.invalidateQueries({ queryKey: ["parts"] });
  };

  const addMut = useMutation({
    mutationFn: async () => {
      if (!selectedPart) throw new Error("Selecciona una pieza");
      const qty = Number(quantity);
      if (!qty || qty <= 0) throw new Error("Cantidad inválida");
      if (qty > selectedPart.stock) throw new Error(`Solo hay ${selectedPart.stock} en stock`);
      return addFn({
        data: {
          maintenance_id: maintenanceId,
          part_id: selectedPart.id,
          quantity: qty,
          unit_cost: selectedPart.unit_cost,
        },
      });
    },
    onSuccess: () => {
      toast.success("Pieza añadida");
      setPartId("");
      setQuantity("1");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Pieza retirada");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Piezas usadas</DialogTitle>
          <DialogDescription>
            Al añadir piezas se descuentan del inventario automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
            <div className="space-y-2">
              <Label>Pieza</Label>
              <Select value={partId} onValueChange={setPartId}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {parts.filter((p) => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.stock <= 0}>
                      {p.name} <span className="text-muted-foreground">({p.stock} {p.unit})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <Button onClick={() => addMut.mutate()} disabled={addMut.isPending || !partId}>
              {addMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Añadir
            </Button>
          </div>

          <div className="border rounded-md divide-y">
            {items.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">Sin piezas aún.</div>
            )}
            {items.map((it) => {
              const p = parts.find((x) => x.id === it.part_id);
              return (
                <div key={it.id} className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{p?.name ?? "Pieza"}</div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {it.quantity} × {it.unit_cost.toFixed(2)} = {it.total.toFixed(2)}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeMut.mutate(it.id)} disabled={removeMut.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
