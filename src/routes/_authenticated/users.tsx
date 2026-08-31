import { Suspense, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { adminUsersQueryOptions } from "@/hooks/useAdminUsers";
import { AdminUser, ROLE_LABELS, deleteUser } from "@/lib/admin.functions";
import { UserFormDialog } from "@/components/admin/UserFormDialog";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "Usuarios y roles — LogiCuba" },
      {
        name: "description",
        content: "Crea usuarios, asigna roles y controla el acceso a la plataforma logística.",
      },
      { property: "og:title", content: "Usuarios y roles — LogiCuba" },
      {
        property: "og:description",
        content: "Administra cuentas y permisos del equipo de operaciones.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(adminUsersQueryOptions),
  component: UsersPage,
});

function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}

function UsersContent() {
  const { data: users } = useSuspenseQuery(adminUsersQueryOptions);
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteUser);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Usuario eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q) ||
      u.roles.some((r) => ROLE_LABELS[r].toLowerCase().includes(q))
    );
  });

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Administración · Accesos
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Usuarios y roles</h1>
          <p className="text-muted-foreground mt-1">
            Crea cuentas del equipo y define qué puede hacer cada persona.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por nombre, correo o rol…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <span className="font-mono text-xs text-muted-foreground">
          {filtered.length} / {users.length}
        </span>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Roles</th>
              <th className="text-left px-4 py-3">Último acceso</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.full_name ?? "Sin nombre"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {u.roles.length === 0 && (
                      <span className="font-mono text-[10px] text-muted-foreground">—</span>
                    )}
                    {u.roles.map((r) => (
                      <span
                        key={r}
                        className={
                          r === "admin"
                            ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary ring-1 ring-primary/30 font-mono text-[10px] uppercase"
                            : "inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground ring-1 ring-border font-mono text-[10px] uppercase"
                        }
                      >
                        {r === "admin" ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : (
                          <UserCog className="h-3 w-3" />
                        )}
                        {ROLE_LABELS[r]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {u.last_sign_in_at
                    ? new Date(u.last_sign_in_at).toLocaleString("es-CU")
                    : "Nunca"}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(u);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`¿Eliminar la cuenta ${u.email}?`)) deleteMutation.mutate(u.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserFormDialog open={open} onOpenChange={setOpen} initial={editing} />
    </div>
  );
}
