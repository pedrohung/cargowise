import { Suspense } from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { invoiceQueryOptions } from "@/hooks/useBilling";
import { companyConfigQueryOptions } from "@/hooks/useCompany";

export const Route = createFileRoute("/_authenticated/invoices_/$id")({
  head: () => ({ meta: [{ title: "Factura — LogiCuba" }] }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(invoiceQueryOptions(params.id)),
      context.queryClient.ensureQueryData(companyConfigQueryOptions),
    ]);
  },
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
      <InvoiceDetailContent />
    </Suspense>
  );
}

function InvoiceDetailContent() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(invoiceQueryOptions(id));
  const { data: company } = useSuspenseQuery(companyConfigQueryOptions);
  const { invoice, items, payments } = data;

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      {/* Print controls (hidden when printing) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to="/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </Button>
      </div>

      {/* Printable invoice */}
      <div className="bg-white text-black rounded-xl shadow-lg p-10 print:shadow-none print:rounded-none print:p-0">
        <div className="flex justify-between items-start pb-6 border-b-2 border-gray-900">
          <div>
            {company?.logo_url && (
              <img src={company.logo_url} alt="Logo" className="h-14 mb-3 object-contain" />
            )}
            <h2 className="text-2xl font-bold">{company?.legal_name ?? "—"}</h2>
            {company?.trade_name && <div className="text-sm text-gray-600">{company.trade_name}</div>}
            <div className="text-sm text-gray-700 mt-1 space-y-0.5">
              {company?.tax_id && <div>NIT: {company.tax_id}</div>}
              {company?.address && <div>{company.address}</div>}
              {company?.province && <div>{company.province}, Cuba</div>}
              {company?.phone && <div>Tel: {company.phone}</div>}
              {company?.email && <div>{company.email}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">FACTURA</div>
            <div className="font-mono text-lg mt-1">{invoice.invoice_number}</div>
            <div className="mt-3 text-sm">
              <div><span className="text-gray-500">Fecha:</span> {new Date(invoice.issue_date).toLocaleDateString("es-CU")}</div>
              {invoice.due_date && (
                <div><span className="text-gray-500">Vence:</span> {new Date(invoice.due_date).toLocaleDateString("es-CU")}</div>
              )}
              <div className="mt-2 inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-900 text-white">
                {invoice.status}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Facturar a</div>
          <div className="text-lg font-semibold">{invoice.client?.name}</div>
        </div>

        <table className="w-full mt-6 text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-3 py-2">Descripción</th>
              <th className="text-right px-3 py-2 w-20">Cant.</th>
              <th className="text-right px-3 py-2 w-32">Precio</th>
              <th className="text-right px-3 py-2 w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-gray-200">
                <td className="px-3 py-2">{it.description}</td>
                <td className="text-right px-3 py-2 tabular-nums">{Number(it.quantity).toLocaleString("es-CU")}</td>
                <td className="text-right px-3 py-2 tabular-nums">{Number(it.unit_price).toLocaleString("es-CU")}</td>
                <td className="text-right px-3 py-2 tabular-nums font-medium">{Number(it.total).toLocaleString("es-CU")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-4">
          <div className="w-72 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal:</span><span className="tabular-nums">{Number(invoice.subtotal).toLocaleString("es-CU")} {invoice.currency}</span></div>
            {Number(invoice.tax_rate) > 0 && (
              <div className="flex justify-between"><span>Impuesto ({invoice.tax_rate}%):</span><span className="tabular-nums">{Number(invoice.tax_amount).toLocaleString("es-CU")} {invoice.currency}</span></div>
            )}
            <div className="flex justify-between text-lg font-bold border-t-2 border-gray-900 pt-2">
              <span>TOTAL:</span>
              <span className="tabular-nums">{Number(invoice.total).toLocaleString("es-CU")} {invoice.currency}</span>
            </div>
            {Number(invoice.amount_paid) > 0 && (
              <>
                <div className="flex justify-between text-green-700"><span>Pagado:</span><span className="tabular-nums">{Number(invoice.amount_paid).toLocaleString("es-CU")} {invoice.currency}</span></div>
                <div className="flex justify-between font-semibold"><span>Saldo:</span><span className="tabular-nums">{(Number(invoice.total) - Number(invoice.amount_paid)).toLocaleString("es-CU")} {invoice.currency}</span></div>
              </>
            )}
          </div>
        </div>

        {(company?.transfermovil_qr_url || company?.enzona_qr_url) && (
          <div className="mt-8 pt-4 border-t border-gray-300">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-3">Métodos de pago</div>
            <div className="flex gap-6">
              {company.transfermovil_qr_url && (
                <div className="text-center">
                  <img src={company.transfermovil_qr_url} alt="Transfermóvil" className="h-28 w-28 object-contain mx-auto" />
                  <div className="text-xs mt-1 font-semibold">Transfermóvil</div>
                </div>
              )}
              {company.enzona_qr_url && (
                <div className="text-center">
                  <img src={company.enzona_qr_url} alt="EnZona" className="h-28 w-28 object-contain mx-auto" />
                  <div className="text-xs mt-1 font-semibold">EnZona</div>
                </div>
              )}
            </div>
          </div>
        )}

        {payments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Historial de pagos</div>
            <table className="w-full text-xs">
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-1.5">{new Date(p.paid_at).toLocaleDateString("es-CU")}</td>
                    <td className="py-1.5 capitalize">{p.method}</td>
                    <td className="py-1.5 text-gray-500">{p.reference ?? "—"}</td>
                    <td className="py-1.5 text-right tabular-nums font-medium">{Number(p.amount).toLocaleString("es-CU")} {p.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(company?.invoice_footer_text || invoice.notes) && (
          <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600 space-y-1">
            {invoice.notes && <div><strong>Notas:</strong> {invoice.notes}</div>}
            {company?.invoice_footer_text && <div className="italic">{company.invoice_footer_text}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
