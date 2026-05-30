import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Upload, Sparkles, Camera } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CURRENCIES, Currency, EXPENSE_CATEGORIES, ExpenseCategory, createExpense,
} from "@/lib/billing.functions";
import { extractExpenseFromImage } from "@/lib/ocr.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseFormDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createExpense);
  const ocrFn = useServerFn(extractExpenseFromImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    category: "fuel" as ExpenseCategory,
    description: "",
    amount: 0,
    currency: "CUP" as Currency,
    expense_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        category: "fuel", description: "", amount: 0, currency: "CUP",
        expense_date: new Date().toISOString().slice(0, 10), notes: "",
      });
      setPreview(null);
    }
  }, [open]);

  const ocrMutation = useMutation({
    mutationFn: async (file: File) => {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      return ocrFn({ data: { image_base64: b64, mime_type: file.type || "image/jpeg" } });
    },
    onSuccess: (data) => {
      setForm((f) => ({
        ...f,
        category: data.category as ExpenseCategory,
        description: data.description || `${data.vendor}`,
        amount: data.amount,
        currency: data.currency as Currency,
        expense_date: data.date || f.expense_date,
        notes: data.tax_id ? `Proveedor: ${data.vendor} · NIT: ${data.tax_id}` : `Proveedor: ${data.vendor}`,
      }));
      toast.success("Datos extraídos del recibo");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFile = (file: File) => {
    if (file.size > 6_000_000) {
      toast.error("La imagen debe pesar menos de 6 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    ocrMutation.mutate(file);
  };

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo gasto</DialogTitle>
          <DialogDescription>Sube un recibo y la IA extraerá los datos, o llena manualmente.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-border p-4">
            <div className="flex items-center gap-3">
              {preview ? (
                <img src={preview} alt="Recibo" className="h-20 w-20 object-cover rounded-md ring-1 ring-border" />
              ) : (
                <div className="h-20 w-20 rounded-md bg-muted grid place-items-center">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> OCR inteligente
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Acepta recibos impresos o manuscritos. Funciona con Lovable AI.
                </p>
                <input
                  ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <Button
                  size="sm" variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrMutation.isPending}
                >
                  {ocrMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {ocrMutation.isPending ? "Procesando…" : "Subir recibo"}
                </Button>
              </div>
            </div>
          </div>

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
