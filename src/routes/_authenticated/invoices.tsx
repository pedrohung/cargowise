import { Suspense, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { invoicesQueryOptions } from "@/hooks/useBilling";
import { Invoice, InvoiceStatus, deleteInvoice } from "@/lib/billing.functions";
import { InvoiceFormDialog } from "@/components/billing/InvoiceFormDialog";
import { PaymentFormDialog } from "@/components/billing/PaymentFormDialog";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "Facturas — LogiCuba" },
      { name: "description", content: "Emite y gestiona facturas." },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(invoicesQueryOptions),
  component: InvoicesPage,
});

const STATUS_META: Record<InvoiceStatus, { label: string; cls: string; icon: any }> = {
  draft: { label: "Borrador", cls: "bg-muted text-muted-foreground ring-border", icon: FileText },
  issued: { label: "Emitida", cls: "bg-blue-500/10 text-blue-400 ring-blue-500/30", icon: Clock },
  paid: { label: "Pagada", cls: "bg-primary/10 text-primary ring-primary/30", icon: CheckCircle2 },
  overdue: { label: "Vencida", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/30", icon: Clock },
  cancelled: { label: "Anulada", cls: "bg-destructive/10 text-destructive ring-destructive/30", icon: XCircle },
};

function InvoicesPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
      <InvoicesContent />
    </Suspense>
  );
}

function InvoicesContent() {
  const { data: invoices } = useSuspenseQuery(invoicesQueryOptions);
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteInvoice);

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Factura eliminada");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = invoices.filter((inv) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.client?.name.toLowerCase().includes(q) ||
      inv.status.includes(q)
    );
  });

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Finanzas · Facturación
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Facturas</h1>
          <p className="text-muted-foreground mt-1">Emite facturas y registra pagos.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva factura
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por número, cliente o estado…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <span className="font-mono text-xs text-muted-foreground">{filtered.length} / {invoices.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 ring-1 ring-primary/30 grid place-items-center mb-4">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">
            {invoices.length === 0 ? "Aún no hay facturas" : "Sin resultados"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {invoices.length === 0 ? "Emite tu primera factura para empezar." : "Prueba con otra búsqueda."}
          </p>
          {invoices.length === 0 && (
            <Button className="mt-6" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Emitir primera factura
            </Button>
          )}
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Factura</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Pagado</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const meta = STATUS_META[inv.status];
                const Icon = meta.icon;
                const pending = Number(inv.total) - Number(inv.amount_paid);
                return (
                  <tr key={inv.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-3">{inv.client?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(inv.issue_date).toLocaleDateString("es-CU")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ring-1 font-mono text-[10px] uppercase ${meta.cls}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(inv.total).toLocaleString("es-CU")} <span className="text-[10px] text-muted-foreground font-mono">{inv.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs text-muted-foreground">
                      {Number(inv.amount_paid).toLocaleString("es-CU")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pending > 0 && inv.status !== "cancelled" && (
                        <Button size="icon" variant="ghost" className="text-primary"
                          onClick={() => { setPayingInvoice(inv); setPayOpen(true); }}>
                          <Wallet className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="text-destructive"
                        onClick={() => {
                          if (confirm(`¿Eliminar ${inv.invoice_number}?`)) deleteMutation.mutate(inv.id);
                        }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <InvoiceFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PaymentFormDialog open={payOpen} onOpenChange={setPayOpen} invoice={payingInvoice} />
    </div>
  );
}
