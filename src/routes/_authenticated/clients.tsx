import { Suspense, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Users,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { clientsQueryOptions } from "@/hooks/useClients";
import { Client, deleteClient } from "@/lib/clients.functions";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clientes — LogiCuba" },
      { name: "description", content: "Gestiona los clientes que solicitan envíos." },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(clientsQueryOptions),
  component: ClientsPage,
});

function ClientsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ClientsContent />
    </Suspense>
  );
}

function ClientsContent() {
  const { data: clients } = useSuspenseQuery(clientsQueryOptions);
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteClient);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Cliente eliminado");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.tax_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Operaciones · Cartera
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Personas y empresas que solicitan envíos.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por nombre, email, teléfono o CI…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <span className="font-mono text-xs text-muted-foreground">
          {filtered.length} / {clients.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 ring-1 ring-primary/30 grid place-items-center mb-4">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">
            {clients.length === 0 ? "Aún no tienes clientes" : "Sin resultados"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.length === 0
              ? "Registra tu primer cliente para empezar a crear pedidos."
              : "Prueba con otra búsqueda."}
          </p>
          {clients.length === 0 && (
            <Button className="mt-6" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> Crear primer cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Contacto</th>
                <th className="text-right px-4 py-3">Crédito</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    {c.tax_id && (
                      <div className="font-mono text-[10px] text-muted-foreground">{c.tax_id}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.is_company ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary ring-1 ring-primary/30 font-mono text-[10px] uppercase">
                        <Building2 className="h-3 w-3" /> Empresa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-muted-foreground ring-1 ring-border font-mono text-[10px] uppercase">
                        <Users className="h-3 w-3" /> Persona
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="space-y-1">
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Mail className="h-3 w-3" /> {c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <div className="font-medium">{Number(c.credit_limit).toLocaleString("es-CU")}</div>
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">CUP</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setEditing(c); setOpen(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`¿Eliminar a "${c.name}"?`)) deleteMutation.mutate(c.id);
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
      )}

      <ClientFormDialog open={open} onOpenChange={setOpen} initial={editing} />
    </div>
  );
}
