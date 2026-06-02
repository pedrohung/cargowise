import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Part, PartCategory, createPart, updatePart } from "@/lib/inventory.functions";

const CATEGORIES: { value: PartCategory; label: string }[] = [
  { value: "engine", label: "Motor" },
  { value: "tires", label: "Neumáticos" },
  { value: "electrical", label: "Eléctrico" },
  { value: "body", label: "Carrocería" },
  { value: "fluids", label: "Lubricantes / fluidos" },
  { value: "filters", label: "Filtros" },
  { value: "brakes", label: "Frenos" },
  { value: "suspension", label: "Suspensión" },
  { value: "consumables", label: "Consumibles" },
  { value: "other", label: "Otro" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Part | null;
}

export function PartFormDialog({ open, onOpenChange, initial }: Props) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createPart);
  const updateFn = useServerFn(updatePart);

  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    category: "other" as PartCategory,
    unit: "unidad",
    min_stock: "0",
    unit_cost: "0",
    currency: "CUP" as Part["currency"],
    location: "",
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        sku: initial.sku ?? "",
        name: initial.name,
        description: initial.description ?? "",
        category: initial.category,
        unit: initial.unit,
        min_stock: initial.min_stock.toString(),
        unit_cost: initial.unit_cost.toString(),
        currency: initial.currency,
        location: initial.location ?? "",
        is_active: initial.is_active,
      });
    } else {
      setForm({
        sku: "", name: "", description: "", category: "other",
        unit: "unidad", min_stock: "0", unit_cost: "0",
        currency: "CUP", location: "", is_active: true,
      });
    }
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("El nombre es requerido");
      const payload = {
        sku: form.sku.trim() || null,
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        unit: form.unit.trim() || "unidad",
        min_stock: Number(form.min_stock) || 0,
        unit_cost: Number(form.unit_cost) || 0,
        currency: form.currency,
        location: form.location.trim() || null,
        is_active: form.is_active,
      };
      if (initial) return updateFn({ data: { id: initial.id, ...payload } });
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(initial ? "Pieza actualizada" : "Pieza creada");
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar pieza" : "Nueva pieza"}</DialogTitle>
          <DialogDescription>
            {initial ? "Modifica los datos. Para ajustar stock usa Movimiento." : "Agrega una pieza al inventario."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="OPT-001" />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as PartCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Filtro de aceite Bosch" />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Stock mínimo</Label>
              <Input type="number" value={form.min_stock} onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Costo unitario</Label>
              <Input type="number" value={form.unit_cost} onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v as Part["currency"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUP">CUP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="MLC">MLC</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Almacén A - Estante 3" />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Activa</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Guardar" : "Crear pieza"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
