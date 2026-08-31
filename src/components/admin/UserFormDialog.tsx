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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AdminUser,
  AppRole,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  createUser,
  updateUser,
} from "@/lib/admin.functions";

const ALL_ROLES: AppRole[] = ["admin", "operator", "accountant", "driver", "client"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: AdminUser | null;
}

export function UserFormDialog({ open, onOpenChange, initial }: Props) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createUser);
  const updateFn = useServerFn(updateUser);

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    roles: ["operator"] as AppRole[],
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        email: initial.email,
        password: "",
        full_name: initial.full_name ?? "",
        phone: initial.phone ?? "",
        roles: initial.roles.length ? initial.roles : ["client"],
      });
    } else {
      setForm({ email: "", password: "", full_name: "", phone: "", roles: ["operator"] });
    }
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (initial) {
        return updateFn({
          data: {
            id: initial.id,
            full_name: form.full_name,
            phone: form.phone || undefined,
            password: form.password || undefined,
            roles: form.roles,
          },
        });
      }
      return createFn({
        data: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone || undefined,
          roles: form.roles,
        },
      });
    },
    onSuccess: () => {
      toast.success(initial ? "Usuario actualizado" : "Usuario creado");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleRole = (role: AppRole) =>
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Actualiza los datos, roles o la contraseña de acceso."
              : "El usuario queda confirmado y puede iniciar sesión de inmediato."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Correo</Label>
            <Input
              id="u-email"
              type="email"
              value={form.email}
              disabled={Boolean(initial)}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="usuario@empresa.cu"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Nombre completo</Label>
              <Input
                id="u-name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-phone">Teléfono</Label>
              <Input
                id="u-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-pass">
              {initial ? "Nueva contraseña (opcional)" : "Contraseña"}
            </Label>
            <Input
              id="u-pass"
              type="text"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="space-y-2">
              {ALL_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    checked={form.roles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{ROLE_LABELS[role]}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Guardar" : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
