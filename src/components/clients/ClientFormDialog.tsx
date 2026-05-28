import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Client, createClient, updateClient } from "@/lib/clients.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Client | null;
}

export function ClientFormDialog({ open, onOpenChange, initial }: Props) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createClient);
  const updateFn = useServerFn(updateClient);

  const [form, setForm] = useState({
    name: "",
    is_company: false,
    tax_id: "",
    email: "",
    phone: "",
    contact_name: "",
    credit_limit: 0,
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        is_company: initial.is_company,
        tax_id: initial.tax_id ?? "",
        email: initial.email ?? "",
        phone: initial.phone ?? "",
        contact_name: initial.contact_name ?? "",
        credit_limit: Number(initial.credit_limit),
        notes: initial.notes ?? "",
        is_active: initial.is_active,
      });
    } else {
      setForm({
        name: "",
        is_company: false,
        tax_id: "",
        email: "",
        phone: "",
        contact_name: "",
        credit_limit: 0,
        notes: "",
        is_active: true,
      });
    }
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("El nombre es requerido");
      const payload = {
        name: form.name.trim(),
        is_company: form.is_company,
        tax_id: form.tax_id.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        contact_name: form.contact_name.trim() || null,
        credit_limit: Number(form.credit_limit) || 0,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      };
      if (initial) return updateFn({ data: { id: initial.id, ...payload } });
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(initial ? "Cliente actualizado" : "Cliente creado");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            Persona o empresa que solicita servicios logísticos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <Label className="text-sm">Empresa</Label>
              <p className="text-xs text-muted-foreground">
                Marca si es una entidad jurídica (con CI fiscal).
              </p>
            </div>
            <Switch
              checked={form.is_company}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_company: v }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nombre {form.is_company ? "comercial" : "completo"}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={form.is_company ? "Importadora Caribe S.A." : "Juan Pérez"}
              />
            </div>
            <div className="space-y-2">
              <Label>{form.is_company ? "NIT / CI Fiscal" : "Carnet de identidad"}</Label>
              <Input
                value={form.tax_id}
                onChange={(e) => setForm((f) => ({ ...f, tax_id: e.target.value }))}
                placeholder={form.is_company ? "B-12345678" : "85010112345"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="cliente@correo.cu"
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+53 5..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Contacto principal</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                placeholder="Nombre del responsable"
              />
            </div>
            <div className="space-y-2">
              <Label>Crédito disponible (CUP)</Label>
              <Input
                type="number"
                min={0}
                value={form.credit_limit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, credit_limit: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Observaciones, horarios, preferencias…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Guardar" : "Crear cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
