import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import {
  CURRENCIES,
  Currency,
  Invoice,
  PAYMENT_METHODS,
  PaymentMethod,
  recordPayment,
} from "@/lib/billing.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export function PaymentFormDialog({ open, onOpenChange, invoice }: Props) {
  const queryClient = useQueryClient();
  const payFn = useServerFn(recordPayment);

  const pending = invoice ? Number(invoice.total) - Number(invoice.amount_paid) : 0;

  const [amount, setAmount] = useState(pending);
  const [currency, setCurrency] = useState<Currency>("CUP");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && invoice) {
      setAmount(Number(invoice.total) - Number(invoice.amount_paid));
      setCurrency(invoice.currency);
      setMethod(invoice.payment_method);
      setReference("");
      setNotes("");
    }
  }, [open, invoice]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error("Factura no encontrada");
      if (amount <= 0) throw new Error("Monto inválido");
      return payFn({
        data: {
          invoice_id: invoice.id,
          client_id: invoice.client_id,
          amount: Number(amount),
          currency,
          method,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Pago registrado");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {invoice ? `Factura ${invoice.invoice_number} · Pendiente: ${pending.toFixed(2)} ${invoice.currency}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" min={0} step={0.01} value={amount}
                onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Referencia (opcional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder="Transfermóvil #..." />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} rows={2} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
