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
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  createExpense,
} from "@/lib/billing.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseFormDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createExpense);

  const [form, setForm] = useState({
    category: "fuel" as ExpenseCategory,
    description: "",
    amount: 0,
    currency: "CUP" as Currency,
    expense_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        category: "fuel",
        description: "",
        amount: 0,
        currency: "CUP",
        expense_date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.description.trim()) throw new Error("Descripción requerida");
      if (form.amount <= 0) throw new Error("Monto inválido");
      return createFn({
        data: {
          category: form.category,
          description: form.description.trim(),
          amount: Number(form.amount),
          currency: form.currency,
          expense_date: form.expense_date,
          notes: form.notes.trim() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Gasto registrado");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo gasto</DialogTitle>
          <DialogDescription>Registra un gasto operativo de la flota.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as ExpenseCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={form.expense_date}
                onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Combustible diesel - viaje LH→SCU" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" min={0} step={0.01} value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={form.currency}
                onValueChange={(v) => setForm((f) => ({ ...f, currency: v as Currency }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={form.notes} rows={2}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
