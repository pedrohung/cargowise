import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
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
import { LocationPicker } from "./LocationPicker";
import { LocationMap } from "./LocationMap";
import {
  ClientLocation,
  createClientLocation,
  updateClientLocation,
} from "@/lib/geography.functions";
import { provincesQueryOptions } from "@/hooks/useGeography";

const TYPES = [
  { value: "residential", label: "Residencial" },
  { value: "commercial", label: "Comercial" },
  { value: "warehouse", label: "Almacén" },
  { value: "pickup_point", label: "Punto de recogida" },
  { value: "other", label: "Otro" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ClientLocation | null;
}

export function LocationFormDialog({ open, onOpenChange, initial }: Props) {
  const queryClient = useQueryClient();
  const { data: provinces } = useSuspenseQuery(provincesQueryOptions);

  const createFn = useServerFn(createClientLocation);
  const updateFn = useServerFn(updateClientLocation);

  const [form, setForm] = useState({
    provinceId: null as string | null,
    municipalityId: null as string | null,
    label: "",
    address_line: "",
    reference: "",
    contact_name: "",
    contact_phone: "",
    location_type: "residential" as (typeof TYPES)[number]["value"],
    is_favorite: false,
    point: null as { lat: number; lng: number } | null,
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        provinceId: initial.province_id,
        municipalityId: initial.municipality_id,
        label: initial.label,
        address_line: initial.address_line,
        reference: initial.reference ?? "",
        contact_name: initial.contact_name ?? "",
        contact_phone: initial.contact_phone ?? "",
        location_type: initial.location_type,
        is_favorite: initial.is_favorite,
        point:
          initial.latitude != null && initial.longitude != null
            ? { lat: Number(initial.latitude), lng: Number(initial.longitude) }
            : null,
      });
    } else {
      setForm({
        provinceId: null,
        municipalityId: null,
        label: "",
        address_line: "",
        reference: "",
        contact_name: "",
        contact_phone: "",
        location_type: "residential",
        is_favorite: false,
        point: null,
      });
    }
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.provinceId || !form.municipalityId) {
        throw new Error("Selecciona provincia y municipio");
      }
      if (!form.label.trim() || !form.address_line.trim()) {
        throw new Error("Etiqueta y dirección son requeridas");
      }
      const payload = {
        province_id: form.provinceId,
        municipality_id: form.municipalityId,
        label: form.label.trim(),
        address_line: form.address_line.trim(),
        reference: form.reference.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        location_type: form.location_type,
        is_favorite: form.is_favorite,
        latitude: form.point?.lat ?? null,
        longitude: form.point?.lng ?? null,
      };
      if (initial) {
        return updateFn({ data: { id: initial.id, ...payload } });
      }
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(initial ? "Punto actualizado" : "Punto creado");
      queryClient.invalidateQueries({ queryKey: ["client-locations"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const selectedProvince = provinces.find((p) => p.id === form.provinceId);
  const mapCenter: [number, number] | undefined =
    selectedProvince?.latitude && selectedProvince?.longitude
      ? [Number(selectedProvince.latitude), Number(selectedProvince.longitude)]
      : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar punto" : "Nuevo punto de entrega"}</DialogTitle>
          <DialogDescription>
            Define la ubicación exacta de un punto de carga, descarga o entrega.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Provincia y municipio</Label>
            <LocationPicker
              provinceId={form.provinceId}
              municipalityId={form.municipalityId}
              onChange={(next) =>
                setForm((f) => ({
                  ...f,
                  provinceId: next.provinceId,
                  municipalityId: next.municipalityId,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="label">Etiqueta</Label>
              <Input
                id="label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Casa, Oficina central, Almacén Vedado…"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.location_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, location_type: v as typeof form.location_type }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              value={form.address_line}
              onChange={(e) => setForm((f) => ({ ...f, address_line: e.target.value }))}
              placeholder="Calle 23 #456 entre L y M, Apto 4B"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia (opcional)</Label>
            <Input
              id="reference"
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="Frente al parque, edificio azul"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contacto</Label>
              <Input
                id="contact_name"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                placeholder="Nombre del contacto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Teléfono</Label>
              <Input
                id="contact_phone"
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                placeholder="+53 5..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ubicación en el mapa (opcional)</Label>
              {form.point && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {form.point.lat.toFixed(5)}, {form.point.lng.toFixed(5)}
                </span>
              )}
            </div>
            <div className="h-[280px]">
              <LocationMap
                value={form.point}
                onChange={(p) => setForm((f) => ({ ...f, point: p }))}
                center={mapCenter}
                className="h-full"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, is_favorite: !f.is_favorite }))}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Star
              className={`h-4 w-4 ${
                form.is_favorite ? "fill-warning text-warning" : ""
              }`}
            />
            {form.is_favorite ? "Marcado como favorito" : "Marcar como favorito"}
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Guardar cambios" : "Crear punto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
