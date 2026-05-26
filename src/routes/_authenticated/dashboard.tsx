import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Truck, Package, DollarSign, MapPin, TrendingUp, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — LogiCuba" },
      { name: "description", content: "Centro de operaciones logísticas en tiempo real." },
    ],
  }),
  component: DashboardPage,
});

const KPIS = [
  { label: "Pedidos activos", value: "0", trend: "+0%", icon: Package, accent: "text-primary" },
  { label: "Flota disponible", value: "0", trend: "—", icon: Truck, accent: "text-foreground" },
  { label: "Ingresos del día (CUP)", value: "0", trend: "—", icon: DollarSign, accent: "text-foreground" },
  { label: "Puntos activos", value: "0", trend: "—", icon: MapPin, accent: "text-foreground" },
];

function DashboardPage() {
  const { data } = useCurrentUser();
  const name = data.profile?.full_name?.split(" ")[0] ?? "Operador";

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
            {new Date().toLocaleDateString("es-CU", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Hola, {name}.
          </h1>
          <p className="text-muted-foreground mt-1">
            Aquí está el estado de tus operaciones en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--color-primary)]" />
          <span className="font-mono uppercase tracking-wider">Sistema operativo</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="glass rounded-xl p-5 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <Icon className={`h-5 w-5 ${kpi.accent}`} />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {kpi.trend}
                </span>
              </div>
              <div className="text-3xl font-semibold tracking-tight tabular-nums">
                {kpi.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-xl p-6 min-h-[280px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold">Actividad reciente</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Últimos eventos de la operación
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-center py-12">
            <div className="inline-flex h-10 w-10 rounded-full bg-muted/50 grid place-items-center mb-3">
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Aún no hay actividad registrada.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Los módulos de pedidos, flota y tracking se activarán próximamente.
            </p>
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h2 className="font-semibold mb-1">Tu sesión</h2>
          <p className="text-xs text-muted-foreground mb-4">Datos de tu cuenta</p>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="font-medium truncate">{data.profile?.full_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Rol</dt>
              <dd className="font-mono text-xs uppercase tracking-wider text-primary">
                {data.roles[0] ?? "client"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono text-[10px] text-muted-foreground truncate">
                {data.userId.slice(0, 8)}…
              </dd>
            </div>
          </dl>
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Próximos módulos</span>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
            </div>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-primary" /> Geografía & puntos de entrega
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-primary/50" /> Pedidos & clientes
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-primary/30" /> Tracking GPS
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
