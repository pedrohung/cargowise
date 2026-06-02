import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Part, recordStockMovement } from "@/lib/inventory.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: Part;
}

export function StockMovementDialog({ open, onOpenChange, part }: Props) {
  const queryClient = useQueryClient();
  const fn = useServerFn(recordStockMovement);

  const [form, setForm] = useState({
    movement_type: "in" as "in" | "out" | "adjustment",
    quantity: "",
    unit_cost: "",
    reason: "",
    reference: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const qty = Number(form.quantity);
      if (!qty || qty < 0) throw new Error("Cantidad inválida");
      return fn({
        data: {
          part_id: part.id,
          movement_type: form.movement_type,
          quantity: qty,
          unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
          reason: form.reason.trim() || null,
          reference: form.reference.trim() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Movimiento registrado");
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      onOpenChange(false);
      setForm({ movement_type: "in", quantity: "", unit_cost: "", reason: "", reference: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimiento de inventario</DialogTitle>
          <DialogDescription>
            {part.name} — stock actual: <span className="font-mono">{part.stock} {part.unit}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.movement_type} onValueChange={(v) => setForm((f) => ({ ...f, movement_type: v as typeof form.movement_type }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Entrada (+)</SelectItem>
                <SelectItem value="out">Salida (−)</SelectItem>
                <SelectItem value="adjustment">Ajuste (=)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Costo unitario</Label>
              <Input type="number" value={form.unit_cost} onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Compra, devolución, inventario..." />
          </div>

          <div className="space-y-2">
            <Label>Referencia</Label>
            <Textarea value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} rows={2} placeholder="Nº factura, proveedor..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
