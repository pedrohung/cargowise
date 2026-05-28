import { ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  LayoutDashboard,
  Users,
  Truck,
  MapPin,
  DollarSign,
  Map,
  FileText,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/orders", label: "Pedidos", icon: FileText },
  { to: "/fleet", label: "Flota", icon: Truck },
  { to: "/locations", label: "Puntos de entrega", icon: MapPin },
  { to: "/tracking", label: "Tracking", icon: Map },
  { to: "/dashboard", label: "Costos", icon: DollarSign, disabled: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data } = useCurrentUser();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const initials = (data.profile?.full_name ?? "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const primaryRole = data.roles[0] ?? "client";

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-primary/15 ring-1 ring-primary/30 grid place-items-center">
            <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">LogiCuba</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Operations
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item, idx) => {
            const Icon = item.icon;
            const isActive = currentPath === item.to && !item.disabled;
            const baseCls = cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
              item.disabled && "opacity-40 cursor-not-allowed",
            );
            const inner = (
              <>
                <Icon className="h-4 w-4" />
                {item.label}
                {item.disabled && (
                  <span className="ml-auto font-mono text-[9px] uppercase text-muted-foreground/60">
                    pronto
                  </span>
                )}
              </>
            );
            return item.disabled ? (
              <div key={idx} className={baseCls}>{inner}</div>
            ) : (
              <Link key={idx} to={item.to} className={baseCls}>{inner}</Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/15 ring-1 ring-primary/30 grid place-items-center text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-sm font-medium truncate">
                {data.profile?.full_name ?? "Usuario"}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {primaryRole}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {currentPath.replace("/", "") || "home"}
            </span>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
