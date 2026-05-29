import { Suspense } from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  FileText,
  Wallet,
  Receipt,
  CircleDollarSign,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { financialSummaryQueryOptions } from "@/hooks/useBilling";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Costos y facturación — LogiCuba" },
      { name: "description", content: "Resumen financiero, facturación y gastos." },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(financialSummaryQueryOptions),
  component: BillingPage,
});

function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const { data } = useSuspenseQuery(financialSummaryQueryOptions);

  const kpis = [
    { label: "Facturado", value: data.totalBilled, icon: FileText, tone: "text-foreground" },
    { label: "Cobrado", value: data.totalCollected, icon: Wallet, tone: "text-primary" },
    { label: "Pendiente", value: data.totalPending, icon: Receipt, tone: "text-amber-400" },
    { label: "Gastos", value: data.totalExpenses, icon: TrendingDown, tone: "text-destructive" },
  ];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
      <div>
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Operaciones · Finanzas
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Costos y facturación</h1>
        <p className="text-muted-foreground mt-1">
          Resumen de ingresos, gastos y resultados operativos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</span>
                <Icon className={`h-4 w-4 ${k.tone}`} />
              </div>
              <div className={`text-2xl font-semibold tabular-nums ${k.tone}`}>
                {k.value.toLocaleString("es-CU", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] font-mono uppercase text-muted-foreground mt-1">CUP equiv.</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Resultado neto</h2>
          </div>
          <div className="flex items-end gap-3">
            <div className={`text-4xl font-semibold tabular-nums ${data.netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
              {data.netIncome.toLocaleString("es-CU", { maximumFractionDigits: 0 })}
            </div>
            <div className="font-mono text-xs uppercase text-muted-foreground pb-2">CUP</div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            {data.netIncome >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-primary" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
            Cobrado − Gastos operativos
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h2 className="font-semibold mb-4">Gastos por categoría</h2>
          {Object.keys(data.expensesByCategory).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay gastos registrados.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.expensesByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amt]) => {
                  const pct = (amt / data.totalExpenses) * 100;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{cat}</span>
                        <span className="tabular-nums font-mono text-xs">{amt.toLocaleString("es-CU", { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/invoices" className="glass rounded-xl p-6 hover:bg-muted/20 transition-colors group">
          <FileText className="h-5 w-5 text-primary mb-3" />
          <h3 className="font-semibold mb-1">Facturas</h3>
          <p className="text-sm text-muted-foreground">Emite y gestiona facturas; registra pagos.</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-primary group-hover:translate-x-1 transition-transform">
            Abrir →
          </div>
        </Link>
        <Link to="/expenses" className="glass rounded-xl p-6 hover:bg-muted/20 transition-colors group">
          <Receipt className="h-5 w-5 text-primary mb-3" />
          <h3 className="font-semibold mb-1">Gastos operativos</h3>
          <p className="text-sm text-muted-foreground">Combustible, mantenimiento, permisos y más.</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-primary group-hover:translate-x-1 transition-transform">
            Abrir →
          </div>
        </Link>
      </div>
    </div>
  );
}
