import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createOrder,
  PACKAGE_TYPES,
  PAYMENT_METHODS,
  PackageType,
  PaymentMethod,
} from "@/lib/orders.functions";
import { clientsQueryOptions } from "@/hooks/useClients";
import { clientLocationsQueryOptions } from "@/hooks/useGeography";

const PACKAGE_LABEL: Record<PackageType, string> = {
  document: "Documento",
  small_package: "Paquete pequeño",
  medium_package: "Paquete mediano",
  large_package: "Paquete grande",
  pallet: "Pallet",
  refrigerated: "Refrigerado",
  fragile: "Frágil",
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  credit: "Crédito",
  prepaid: "Prepagado",
};

type ItemDraft = {
  description: string;
  package_type: PackageType;
  quantity: number;
  weight_kg: string;
  declared_value: string;
};

const emptyItem = (): ItemDraft => ({
  description: "",
  package_type: "small_package",
  quantity: 1,
  weight_kg: "",
  declared_value: "",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderFormDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: clients } = useSuspenseQuery(clientsQueryOptions);
  const { data: locations } = useSuspenseQuery(clientLocationsQueryOptions);
  const createFn = useServerFn(createOrder);

  const [form, setForm] = useState({
    client_id: "",
    origin_location_id: "none",
    destination_location_id: "none",
    origin_address: "",
    destination_address: "",
    payment_method: "cash" as PaymentMethod,
    base_cost: 0,
    notes: "",
    recipient_name: "",
    recipient_phone: "",
  });
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);

  useEffect(() => {
    if (!open) {
      setForm({
        client_id: "",
        origin_location_id: "none",
        destination_location_id: "none",
        origin_address: "",
        destination_address: "",
        payment_method: "cash",
        base_cost: 0,
        notes: "",
        recipient_name: "",
        recipient_phone: "",
      });
      setItems([emptyItem()]);
    }
  }, [open]);

  // Sync chosen saved location into address fields
  const onOriginLocation = (id: string) => {
    const loc = locations.find((l) => l.id === id);
    setForm((f) => ({
      ...f,
      origin_location_id: id,
      origin_address: loc ? `${loc.label} — ${loc.address_line}` : f.origin_address,
    }));
  };
  const onDestLocation = (id: string) => {
    const loc = locations.find((l) => l.id === id);
    setForm((f) => ({
      ...f,
      destination_location_id: id,
      destination_address: loc ? `${loc.label} — ${loc.address_line}` : f.destination_address,
    }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.client_id) throw new Error("Selecciona un cliente");
      if (!form.origin_address.trim() || !form.destination_address.trim()) {
        throw new Error("Origen y destino son requeridos");
      }
      const cleanItems = items
        .filter((i) => i.description.trim())
        .map((i) => ({
          description: i.description.trim(),
          package_type: i.package_type,
          quantity: Number(i.quantity) || 1,
          weight_kg: i.weight_kg ? Number(i.weight_kg) : null,
          declared_value: i.declared_value ? Number(i.declared_value) : null,
        }));

      const originLoc = locations.find((l) => l.id === form.origin_location_id);
      const destLoc = locations.find((l) => l.id === form.destination_location_id);

      return createFn({
        data: {
          client_id: form.client_id,
          origin_location_id: form.origin_location_id === "none" ? null : form.origin_location_id,
          destination_location_id:
            form.destination_location_id === "none" ? null : form.destination_location_id,
          origin_address: form.origin_address.trim(),
          destination_address: form.destination_address.trim(),
          origin_lat: originLoc?.latitude ? Number(originLoc.latitude) : null,
          origin_lng: originLoc?.longitude ? Number(originLoc.longitude) : null,
          destination_lat: destLoc?.latitude ? Number(destLoc.latitude) : null,
          destination_lng: destLoc?.longitude ? Number(destLoc.longitude) : null,
          payment_method: form.payment_method,
          base_cost: Number(form.base_cost) || 0,
          total_cost: Number(form.base_cost) || 0,
          status: "pending",
          recipient_name: form.recipient_name.trim() || null,
          recipient_phone: form.recipient_phone.trim() || null,
          notes: form.notes.trim() || null,
          items: cleanItems,
        },
      });
    },
    onSuccess: () => {
      toast.success("Pedido creado");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo pedido</DialogTitle>
          <DialogDescription>Crea una solicitud de transporte.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                value={form.payment_method}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, payment_method: v as PaymentMethod }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => (
                    <SelectItem key={p} value={p}>{PAYMENT_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Origen
              </Label>
              <Select value={form.origin_location_id} onValueChange={onOriginLocation}>
                <SelectTrigger><SelectValue placeholder="Punto guardado…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Dirección manual —</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label} · {l.municipality?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Dirección de recogida"
                rows={2}
                value={form.origin_address}
                onChange={(e) => setForm((f) => ({ ...f, origin_address: e.target.value }))}
              />
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Destino
              </Label>
              <Select value={form.destination_location_id} onValueChange={onDestLocation}>
                <SelectTrigger><SelectValue placeholder="Punto guardado…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Dirección manual —</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label} · {l.municipality?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Dirección de entrega"
                rows={2}
                value={form.destination_address}
                onChange={(e) => setForm((f) => ({ ...f, destination_address: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Destinatario</Label>
              <Input
                value={form.recipient_name}
                onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))}
                placeholder="Nombre de quien recibe"
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono destinatario</Label>
              <Input
                value={form.recipient_phone}
                onChange={(e) => setForm((f) => ({ ...f, recipient_phone: e.target.value }))}
                placeholder="+53 5..."
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Paquetes</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setItems((it) => [...it, emptyItem()])}
              >
                <Plus className="h-3.5 w-3.5" /> Añadir
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-end rounded-md border border-border p-2"
                >
                  <div className="col-span-12 sm:col-span-5 space-y-1">
                    <Label className="text-xs text-muted-foreground">Descripción</Label>
                    <Input
                      value={it.description}
                      onChange={(e) => {
                        const v = e.target.value;
                        setItems((arr) =>
                          arr.map((x, i) => (i === idx ? { ...x, description: v } : x)),
                        );
                      }}
                      placeholder="Caja de electrónica"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <Select
                      value={it.package_type}
                      onValueChange={(v) =>
                        setItems((arr) =>
                          arr.map((x, i) =>
                            i === idx ? { ...x, package_type: v as PackageType } : x,
                          ),
                        )
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PACKAGE_TYPES.map((p) => (
                          <SelectItem key={p} value={p}>{PACKAGE_LABEL[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 sm:col-span-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Cant.</Label>
                    <Input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setItems((arr) =>
                          arr.map((x, i) => (i === idx ? { ...x, quantity: v } : x)),
                        );
                      }}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Peso kg</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={it.weight_kg}
                      onChange={(e) => {
                        const v = e.target.value;
                        setItems((arr) =>
                          arr.map((x, i) => (i === idx ? { ...x, weight_kg: v } : x)),
                        );
                      }}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() =>
                        setItems((arr) =>
                          arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr,
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Costo base (CUP)</Label>
              <Input
                type="number"
                min={0}
                value={form.base_cost}
                onChange={(e) => setForm((f) => ({ ...f, base_cost: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Instrucciones especiales"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
