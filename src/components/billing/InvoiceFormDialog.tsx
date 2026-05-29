import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientsQueryOptions } from "@/hooks/useClients";
import {
  CURRENCIES,
  Currency,
  PAYMENT_METHODS,
  PaymentMethod,
  createInvoice,
} from "@/lib/billing.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Line = { description: string; quantity: number; unit_price: number };

export function InvoiceFormDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createInvoice);
  const { data: clients = [] } = useQuery(clientsQueryOptions);

  const [clientId, setClientId] = useState("");
  const [currency, setCurrency] = useState<Currency>("CUP");
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { description: "Servicio de transporte", quantity: 1, unit_price: 0 },
  ]);

  useEffect(() => {
    if (open) {
      setClientId("");
      setCurrency("CUP");
      setTaxRate(0);
      setPaymentMethod("cash");
      setDueDate("");
      setNotes("");
      setLines([{ description: "Servicio de transporte", quantity: 1, unit_price: 0 }]);
    }
  }, [open]);

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Selecciona un cliente");
      if (lines.some((l) => !l.description.trim()))
        throw new Error("Todas las líneas requieren descripción");
      return createFn({
        data: {
          client_id: clientId,
          currency,
          tax_rate: taxRate,
          payment_method: paymentMethod,
          due_date: dueDate || null,
          notes: notes.trim() || null,
          status: "issued",
          items: lines.map((l) => ({
            description: l.description.trim(),
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price),
          })),
        },
      });
    },
    onSuccess: () => {
      toast.success("Factura creada");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((curr) => curr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva factura</DialogTitle>
          <DialogDescription>Emite una factura para un cliente.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vencimiento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Impuesto %</Label>
              <Input type="number" min={0} max={100} value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Líneas de factura</Label>
              <Button size="sm" variant="outline" onClick={() =>
                setLines((c) => [...c, { description: "", quantity: 1, unit_price: 0 }])
              }>
                <Plus className="h-3.5 w-3.5" /> Añadir línea
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 rounded-md border border-border">
                  <div className="col-span-6 space-y-1">
                    <Label className="text-[10px] font-mono uppercase">Descripción</Label>
                    <Input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px] font-mono uppercase">Cant.</Label>
                    <Input type="number" min={0} step={0.01} value={l.quantity}
                      onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-[10px] font-mono uppercase">Precio</Label>
                    <Input type="number" min={0} step={0.01} value={l.unit_price}
                      onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-1">
                    <Button size="icon" variant="ghost" className="text-destructive"
                      onClick={() => setLines((c) => c.filter((_, idx) => idx !== i))}
                      disabled={lines.length === 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border p-3 space-y-1 font-mono text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toFixed(2)} {currency}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Impuesto ({taxRate}%)</span><span>{taxAmount.toFixed(2)} {currency}</span></div>
            <div className="flex justify-between text-base font-semibold pt-1 border-t border-border"><span>Total</span><span className="text-primary">{total.toFixed(2)} {currency}</span></div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Emitir factura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
