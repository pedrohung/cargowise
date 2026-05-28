import { OrderStatus } from "@/lib/orders.functions";
import { cn } from "@/lib/utils";

const META: Record<OrderStatus, { label: string; cls: string }> = {
  draft:      { label: "Borrador",   cls: "bg-muted text-muted-foreground ring-border" },
  pending:    { label: "Pendiente",  cls: "bg-warning/10 text-warning ring-warning/30" },
  confirmed:  { label: "Confirmado", cls: "bg-primary/10 text-primary ring-primary/30" },
  assigned:   { label: "Asignado",   cls: "bg-primary/10 text-primary ring-primary/30" },
  picked_up:  { label: "Recogido",   cls: "bg-primary/15 text-primary ring-primary/40" },
  in_transit: { label: "En ruta",    cls: "bg-primary/20 text-primary ring-primary/50 shadow-[0_0_12px_var(--color-primary)]" },
  delivered:  { label: "Entregado",  cls: "bg-success/15 text-success ring-success/40" },
  cancelled:  { label: "Cancelado",  cls: "bg-destructive/10 text-destructive ring-destructive/30" },
  returned:   { label: "Devuelto",   cls: "bg-destructive/10 text-destructive ring-destructive/30" },
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const m = META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] uppercase tracking-wider ring-1",
        m.cls,
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {m.label}
    </span>
  );
}
