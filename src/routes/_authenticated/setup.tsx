import { Suspense, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, Building2, Banknote, FileCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { companyConfigQueryOptions } from "@/hooks/useCompany";
import { updateCompanyConfig } from "@/lib/company.functions";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({ meta: [{ title: "Configuración inicial — LogiCuba" }] }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(companyConfigQueryOptions),
  component: SetupPage,
});

const CUBA_PROVINCES = [
  "Pinar del Río", "Artemisa", "La Habana", "Mayabeque", "Matanzas",
  "Villa Clara", "Cienfuegos", "Sancti Spíritus", "Ciego de Ávila",
  "Camagüey", "Las Tunas", "Holguín", "Granma", "Santiago de Cuba",
  "Guantánamo", "Isla de la Juventud",
];

function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
      <SetupContent />
    </Suspense>
  );
}

function SetupContent() {
  const { data: config } = useSuspenseQuery(companyConfigQueryOptions);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateCompanyConfig);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    legal_name: config?.legal_name ?? "",
    trade_name: config?.trade_name ?? "",
    tax_id: config?.tax_id ?? "",
    address: config?.address ?? "",
    province: config?.province ?? "",
    phone: config?.phone ?? "",
    email: config?.email ?? "",
    default_currency: config?.default_currency ?? "CUP",
    default_usd_exchange_rate: config?.default_usd_exchange_rate ?? 240,
    default_diesel_price: config?.default_diesel_price ?? 195,
    territorial_contribution_rate: config?.territorial_contribution_rate ?? 0,
    invoice_prefix: config?.invoice_prefix ?? "FC-",
    invoice_footer_text: config?.invoice_footer_text ?? "",
    transfermovil_qr_url: config?.transfermovil_qr_url ?? "",
    enzona_qr_url: config?.enzona_qr_url ?? "",
  });

  const mutation = useMutation({
    mutationFn: () => updateFn({ data: { ...form, wizard_completed: true } as any }),
    onSuccess: () => {
      toast.success("Configuración guardada");
      queryClient.invalidateQueries({ queryKey: ["company-config"] });
      navigate({ to: "/dashboard" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const steps = [
    { n: 1, label: "Empresa", icon: Building2 },
    { n: 2, label: "Fiscal & Pagos", icon: Banknote },
    { n: 3, label: "Facturación", icon: FileCheck },
  ];

  return (
    <div className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex h-12 w-12 rounded-xl bg-primary/15 ring-1 ring-primary/30 items-center justify-center mb-3">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Configuración inicial</div>
        <h1 className="text-3xl font-semibold">Configura tu empresa</h1>
        <p className="text-muted-foreground mt-2 text-sm">Estos datos aparecerán en tus facturas y reportes.</p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const active = step === s.n;
          const done = step > s.n;
          return (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`h-9 w-9 rounded-full grid place-items-center ring-1 transition-colors ${
                active ? "bg-primary/15 ring-primary text-primary" :
                done ? "bg-primary text-primary-foreground ring-primary" :
                "bg-muted ring-border text-muted-foreground"
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-xs font-mono uppercase tracking-wider ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-border mx-2" />}
            </div>
          );
        })}
      </div>

      <div className="glass rounded-xl p-6 space-y-4">
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Razón social *">
                <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
              </Field>
              <Field label="Nombre comercial">
                <Input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="NIT / Identificación fiscal">
                <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
              </Field>
              <Field label="Provincia">
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                  <option value="">Selecciona…</option>
                  {CUBA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Dirección">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Moneda base">
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value as any })}>
                  {["CUP", "USD", "MLC", "EUR"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Tasa USD → CUP">
                <Input type="number" value={form.default_usd_exchange_rate}
                  onChange={(e) => setForm({ ...form, default_usd_exchange_rate: Number(e.target.value) })} />
              </Field>
              <Field label="Precio diésel (CUP/L)">
                <Input type="number" value={form.default_diesel_price}
                  onChange={(e) => setForm({ ...form, default_diesel_price: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Contribución territorial (%)">
              <Input type="number" step="0.1" value={form.territorial_contribution_rate}
                onChange={(e) => setForm({ ...form, territorial_contribution_rate: Number(e.target.value) })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="URL QR Transfermóvil">
                <Input placeholder="https://…" value={form.transfermovil_qr_url}
                  onChange={(e) => setForm({ ...form, transfermovil_qr_url: e.target.value })} />
              </Field>
              <Field label="URL QR EnZona">
                <Input placeholder="https://…" value={form.enzona_qr_url}
                  onChange={(e) => setForm({ ...form, enzona_qr_url: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Sube las imágenes de QR a un servicio público (o usa el bucket de la app) y pega la URL aquí.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Prefijo de factura">
              <Input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} />
            </Field>
            <Field label="Pie de página legal (aparecerá en cada factura)">
              <Textarea rows={3} value={form.invoice_footer_text}
                onChange={(e) => setForm({ ...form, invoice_footer_text: e.target.value })}
                placeholder="Gracias por su preferencia. Esta factura cumple con la Resolución..." />
            </Field>
            <div className="rounded-md bg-muted/30 p-3 text-xs space-y-1">
              <div className="font-mono uppercase tracking-wider text-muted-foreground">Vista previa</div>
              <div className="font-semibold">{form.legal_name || "—"}</div>
              <div className="text-muted-foreground">NIT: {form.tax_id || "—"} · {form.province || "—"}</div>
              <div className="text-muted-foreground">{form.address || "—"}</div>
            </div>
          </>
        )}

        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Finalizar configuración
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
