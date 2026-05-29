import { Suspense, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { expensesQueryOptions } from "@/hooks/useBilling";
import { deleteExpense } from "@/lib/billing.functions";
import { ExpenseFormDialog } from "@/components/billing/ExpenseFormDialog";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Gastos — LogiCuba" },
      { name: "description", content: "Registra y consulta gastos operativos." },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(expensesQueryOptions),
  component: ExpensesPage,
});

function ExpensesPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
      <ExpensesContent />
    </Suspense>
  );
}

function ExpensesContent() {
  const { data: expenses } = useSuspenseQuery(expensesQueryOptions);
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteExpense);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Gasto eliminado");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = expenses.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return e.description.toLowerCase().includes(q) || e.category.includes(q);
  });

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Finanzas · Gastos
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Gastos operativos</h1>
          <p className="text-muted-foreground mt-1">
            Combustible, mantenimiento, permisos y más.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo gasto
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por descripción o categoría…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <span className="font-mono text-xs text-muted-foreground">
          {filtered.length} · Total: <span className="text-foreground">{total.toLocaleString("es-CU", { maximumFractionDigits: 0 })}</span>
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 ring-1 ring-primary/30 grid place-items-center mb-4">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">
            {expenses.length === 0 ? "Aún no hay gastos" : "Sin resultados"}
          </h3>
          {expenses.length === 0 && (
            <Button className="mt-6" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Registrar primer gasto
            </Button>
          )}
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-left px-4 py-3">Descripción</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(e.expense_date).toLocaleDateString("es-CU")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground ring-1 ring-border font-mono text-[10px] uppercase">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">{e.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(e.amount).toLocaleString("es-CU")} <span className="text-[10px] text-muted-foreground font-mono">{e.currency}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" className="text-destructive"
                      onClick={() => { if (confirm("¿Eliminar gasto?")) deleteMutation.mutate(e.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ExpenseFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
