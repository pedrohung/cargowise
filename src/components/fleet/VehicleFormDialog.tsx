import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Vehicle, createVehicle, updateVehicle } from "@/lib/fleet.functions";
import { driversQueryOptions } from "@/hooks/useFleet";

const VEHICLE_TYPES = [
  { value: "motorcycle", label: "Motocicleta" },
  { value: "car", label: "Auto" },
  { value: "van", label: "Furgoneta" },
  { value: "truck_small", label: "Camión ligero" },
  { value: "truck_medium", label: "Camión medio" },
  { value: "truck_large", label: "Camión pesado" },
] as const;

const STATUSES = [
  { value: "available", label: "Disponible" },
  { value: "in_route", label: "En ruta" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "inactive", label: "Inactivo" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Vehicle | null;
}

export function VehicleFormDialog({ open, onOpenChange, initial }: Props) {
  const queryClient = useQueryClient();
  const { data: drivers } = useSuspenseQuery(driversQueryOptions);
  const createFn = useServerFn(createVehicle);
  const updateFn = useServerFn(updateVehicle);

  const [form, setForm] = useState({
    plate: "",
    brand: "",
    model: "",
    year: "",
    vehicle_type: "van" as Vehicle["vehicle_type"],
    capacity_kg: "",
    capacity_m3: "",
    driver_id: "none" as string,
    status: "available" as Vehicle["status"],
    fuel_level: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        plate: initial.plate,
        brand: initial.brand ?? "",
        model: initial.model ?? "",
        year: initial.year?.toString() ?? "",
        vehicle_type: initial.vehicle_type,
        capacity_kg: initial.capacity_kg?.toString() ?? "",
        capacity_m3: initial.capacity_m3?.toString() ?? "",
        driver_id: initial.driver_id ?? "none",
        status: initial.status,
        fuel_level: initial.fuel_level?.toString() ?? "",
        notes: initial.notes ?? "",
      });
    } else {
      setForm({
        plate: "",
        brand: "",
        model: "",
        year: "",
        vehicle_type: "van",
        capacity_kg: "",
        capacity_m3: "",
        driver_id: "none",
        status: "available",
        fuel_level: "",
        notes: "",
      });
    }
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.plate.trim()) throw new Error("La placa es requerida");
      const payload = {
        plate: form.plate.trim().toUpperCase(),
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        year: form.year ? Number(form.year) : null,
        vehicle_type: form.vehicle_type,
        capacity_kg: form.capacity_kg ? Number(form.capacity_kg) : null,
        capacity_m3: form.capacity_m3 ? Number(form.capacity_m3) : null,
        driver_id: form.driver_id === "none" ? null : form.driver_id,
        status: form.status,
        fuel_level: form.fuel_level ? Number(form.fuel_level) : null,
        notes: form.notes.trim() || null,
      };
      if (initial) return updateFn({ data: { id: initial.id, ...payload } });
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(initial ? "Vehículo actualizado" : "Vehículo creado");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar vehículo" : "Nuevo vehículo"}</DialogTitle>
          <DialogDescription>Registra una unidad de la flota.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Placa / Chapa</Label>
              <Input
                value={form.plate}
                onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
                placeholder="P123456"
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.vehicle_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, vehicle_type: v as Vehicle["vehicle_type"] }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Año</Label>
              <Input
                type="number"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Capacidad (kg)</Label>
              <Input
                type="number"
                value={form.capacity_kg}
                onChange={(e) => setForm((f) => ({ ...f, capacity_kg: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Volumen (m³)</Label>
              <Input
                type="number"
                value={form.capacity_m3}
                onChange={(e) => setForm((f) => ({ ...f, capacity_m3: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Combustible (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.fuel_level}
                onChange={(e) => setForm((f) => ({ ...f, fuel_level: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Conductor asignado</Label>
              <Select
                value={form.driver_id}
                onValueChange={(v) => setForm((f) => ({ ...f, driver_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.user_id} value={d.user_id}>
                      {d.full_name ?? "Conductor"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as Vehicle["status"] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Guardar" : "Crear vehículo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
