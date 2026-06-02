import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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
import {
  MaintenanceRecord, MaintenanceStatus, MaintenanceType,
  createMaintenance, updateMaintenance,
} from "@/lib/maintenance.functions";
import { vehiclesQueryOptions } from "@/hooks/useFleet";

const TYPES: { value: MaintenanceType; label: string }[] = [
  { value: "preventive", label: "Preventivo" },
  { value: "corrective", label: "Correctivo" },
  { value: "inspection", label: "Inspección" },
  { value: "oil_change", label: "Cambio de aceite" },
  { value: "tire_change", label: "Cambio de neumáticos" },
  { value: "other", label: "Otro" },
];

const STATUSES: { value: MaintenanceStatus; label: string }[] = [
  { value: "scheduled", label: "Programado" },
  { value: "in_progress", label: "En curso" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: MaintenanceRecord | null;
  defaultVehicleId?: string;
}

export function MaintenanceFormDialog({ open, onOpenChange, initial, defaultVehicleId }: Props) {
  const queryClient = useQueryClient();
  const { data: vehicles } = useSuspenseQuery(vehiclesQueryOptions);
  const createFn = useServerFn(createMaintenance);
  const updateFn = useServerFn(updateMaintenance);

  const [form, setForm] = useState({
    vehicle_id: defaultVehicleId ?? "",
    maintenance_type: "preventive" as MaintenanceType,
    status: "scheduled" as MaintenanceStatus,
    scheduled_date: "",
    completed_at: "",
    odometer_km: "",
    next_service_km: "",
    next_service_date: "",
    description: "",
    labor_cost: "0",
    currency: "CUP" as MaintenanceRecord["currency"],
    performed_by: "",
    workshop: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        vehicle_id: initial.vehicle_id,
        maintenance_type: initial.maintenance_type,
        status: initial.status,
        scheduled_date: initial.scheduled_date ?? "",
        completed_at: initial.completed_at ? initial.completed_at.slice(0, 16) : "",
        odometer_km: initial.odometer_km?.toString() ?? "",
        next_service_km: initial.next_service_km?.toString() ?? "",
        next_service_date: initial.next_service_date ?? "",
        description: initial.description,
        labor_cost: initial.labor_cost.toString(),
        currency: initial.currency,
        performed_by: initial.performed_by ?? "",
        workshop: initial.workshop ?? "",
        notes: initial.notes ?? "",
      });
    } else {
      setForm((f) => ({
        ...f,
        vehicle_id: defaultVehicleId ?? "",
        maintenance_type: "preventive",
        status: "scheduled",
        scheduled_date: "",
        completed_at: "",
        odometer_km: "",
        next_service_km: "",
        next_service_date: "",
        description: "",
        labor_cost: "0",
        currency: "CUP",
        performed_by: "",
        workshop: "",
        notes: "",
      }));
    }
  }, [open, initial, defaultVehicleId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.vehicle_id) throw new Error("Selecciona un vehículo");
      if (!form.description.trim()) throw new Error("Describe el mantenimiento");
      const payload = {
        vehicle_id: form.vehicle_id,
        maintenance_type: form.maintenance_type,
        status: form.status,
        scheduled_date: form.scheduled_date || null,
        completed_at: form.completed_at ? new Date(form.completed_at).toISOString() : null,
        odometer_km: form.odometer_km ? Number(form.odometer_km) : null,
        next_service_km: form.next_service_km ? Number(form.next_service_km) : null,
        next_service_date: form.next_service_date || null,
        description: form.description.trim(),
        labor_cost: Number(form.labor_cost) || 0,
        currency: form.currency,
        performed_by: form.performed_by.trim() || null,
        workshop: form.workshop.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (initial) return updateFn({ data: { id: initial.id, ...payload } });
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(initial ? "Mantenimiento actualizado" : "Mantenimiento registrado");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar mantenimiento" : "Nuevo mantenimiento"}</DialogTitle>
          <DialogDescription>Registra o programa un servicio para un vehículo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2 sm:col-span-1">
              <Label>Vehículo</Label>
              <Select value={form.vehicle_id} onValueChange={(v) => setForm((f) => ({ ...f, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate} — {v.brand ?? ""} {v.model ?? ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.maintenance_type} onValueChange={(v) => setForm((f) => ({ ...f, maintenance_type: v as MaintenanceType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as MaintenanceStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción del servicio</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha programada</Label>
              <Input type="date" value={form.scheduled_date} onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Completado</Label>
              <Input type="datetime-local" value={form.completed_at} onChange={(e) => setForm((f) => ({ ...f, completed_at: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Odómetro (km)</Label>
              <Input type="number" value={form.odometer_km} onChange={(e) => setForm((f) => ({ ...f, odometer_km: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Próximo servicio (km)</Label>
              <Input type="number" value={form.next_service_km} onChange={(e) => setForm((f) => ({ ...f, next_service_km: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Próximo servicio (fecha)</Label>
              <Input type="date" value={form.next_service_date} onChange={(e) => setForm((f) => ({ ...f, next_service_date: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Mano de obra</Label>
              <Input type="number" value={form.labor_cost} onChange={(e) => setForm((f) => ({ ...f, labor_cost: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v as MaintenanceRecord["currency"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUP">CUP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="MLC">MLC</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Taller</Label>
              <Input value={form.workshop} onChange={(e) => setForm((f) => ({ ...f, workshop: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Realizado por</Label>
              <Input value={form.performed_by} onChange={(e) => setForm((f) => ({ ...f, performed_by: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
