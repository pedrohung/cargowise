import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const INVOICE_STATUSES = ["draft", "issued", "paid", "overdue", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const CURRENCIES = ["CUP", "USD", "MLC", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const EXPENSE_CATEGORIES = [
  "fuel", "maintenance", "tolls", "salaries", "parts", "permits", "food", "lodging", "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = ["cash", "transfer", "credit", "prepaid"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type Invoice = {
  id: string;
  invoice_number: string;
  client_id: string;
  order_id: string | null;
  issue_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  currency: Currency;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  paid_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string; is_company: boolean } | null;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type Payment = {
  id: string;
  invoice_id: string | null;
  client_id: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  reference: string | null;
  paid_at: string;
  notes: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: Currency;
  expense_date: string;
  vehicle_id: string | null;
  driver_id: string | null;
  order_id: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
};

// ============= INVOICES =============

const invoiceItemInput = z.object({
  description: z.string().min(1).max(300),
  quantity: z.number().min(0.01).default(1),
  unit_price: z.number().min(0).default(0),
});

const invoiceInput = z.object({
  client_id: z.string().uuid(),
  order_id: z.string().uuid().optional().nullable(),
  issue_date: z.string().optional(),
  due_date: z.string().optional().nullable(),
  status: z.enum(INVOICE_STATUSES).default("draft"),
  currency: z.enum(CURRENCIES).default("CUP"),
  tax_rate: z.number().min(0).max(100).default(0),
  payment_method: z.enum(PAYMENT_METHODS).default("cash"),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(invoiceItemInput).min(1),
});

async function attachClients<T extends { client_id: string }>(
  supabase: ReturnType<typeof requireSupabaseAuth> extends never ? never : any,
  rows: T[],
): Promise<(T & { client: Invoice["client"] })[]> {
  const ids = Array.from(new Set(rows.map((r) => r.client_id)));
  if (ids.length === 0) return rows.map((r) => ({ ...r, client: null }));
  const { data } = await supabase.from("clients").select("id, name, is_company").in("id", ids);
  const map = new Map((data ?? []).map((c: any) => [c.id, c]));
  return rows.map((r) => ({ ...r, client: (map.get(r.client_id) as Invoice["client"]) ?? null }));
}

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const withClients = await attachClients(context.supabase, data ?? []);
    return withClients as Invoice[];
  });

export const getInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: invoice, error }, { data: items }, { data: payments }] = await Promise.all([
      context.supabase
        .from("invoices")
        .select("*, client:clients(id, name, is_company)")
        .eq("id", data.id)
        .single(),
      context.supabase.from("invoice_items").select("*").eq("invoice_id", data.id),
      context.supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", data.id)
        .order("paid_at", { ascending: false }),
    ]);
    if (error) throw new Error(error.message);
    return {
      invoice: invoice as Invoice,
      items: (items ?? []) as InvoiceItem[],
      payments: (payments ?? []) as Payment[],
    };
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => invoiceInput.parse(input))
  .handler(async ({ data, context }) => {
    const items = data.items.map((i) => ({
      ...i,
      total: Number((i.quantity * i.unit_price).toFixed(2)),
    }));
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const tax_amount = Number(((subtotal * data.tax_rate) / 100).toFixed(2));
    const total = Number((subtotal + tax_amount).toFixed(2));

    const { items: _, ...rest } = data;
    const { data: invoice, error } = await context.supabase
      .from("invoices")
      .insert({
        ...rest,
        subtotal,
        tax_amount,
        total,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { error: iErr } = await context.supabase
      .from("invoice_items")
      .insert(items.map((i) => ({ ...i, invoice_id: invoice.id })));
    if (iErr) throw new Error(iErr.message);

    return invoice;
  });

export const updateInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), status: z.enum(INVOICE_STATUSES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("invoices")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= PAYMENTS =============

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        invoice_id: z.string().uuid().optional().nullable(),
        client_id: z.string().uuid(),
        amount: z.number().min(0.01),
        currency: z.enum(CURRENCIES).default("CUP"),
        method: z.enum(PAYMENT_METHODS).default("cash"),
        reference: z.string().max(120).optional().nullable(),
        paid_at: z.string().optional(),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("payments")
      .insert({ ...data, recorded_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payments")
      .select("*")
      .order("paid_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as Payment[];
  });

// ============= EXPENSES =============

const expenseInput = z.object({
  category: z.enum(EXPENSE_CATEGORIES).default("other"),
  description: z.string().min(1).max(300),
  amount: z.number().min(0),
  currency: z.enum(CURRENCIES).default("CUP"),
  expense_date: z.string().optional(),
  vehicle_id: z.string().uuid().optional().nullable(),
  order_id: z.string().uuid().optional().nullable(),
  driver_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as Expense[];
  });

export const createExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => expenseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("expenses")
      .insert({ ...data, recorded_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= FINANCIAL SUMMARY =============

export const getFinancialSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [invRes, expRes, payRes] = await Promise.all([
      context.supabase.from("invoices").select("status, total, amount_paid, currency"),
      context.supabase.from("expenses").select("amount, currency, category"),
      context.supabase.from("payments").select("amount, currency, paid_at"),
    ]);

    const invoices = (invRes.data ?? []) as Pick<Invoice, "status" | "total" | "amount_paid" | "currency">[];
    const expenses = (expRes.data ?? []) as Pick<Expense, "amount" | "currency" | "category">[];
    const payments = (payRes.data ?? []) as Pick<Payment, "amount" | "currency" | "paid_at">[];

    const sumBy = <T,>(arr: T[], key: (i: T) => number) => arr.reduce((s, i) => s + Number(key(i)), 0);

    const totalBilled = sumBy(invoices.filter((i) => i.status !== "cancelled"), (i) => i.total);
    const totalCollected = sumBy(invoices, (i) => i.amount_paid);
    const totalPending = totalBilled - totalCollected;
    const totalExpenses = sumBy(expenses, (e) => e.amount);
    const netIncome = totalCollected - totalExpenses;

    const expensesByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
      return acc;
    }, {});

    const invoiceCounts = invoices.reduce<Record<string, number>>((acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      totalBilled,
      totalCollected,
      totalPending,
      totalExpenses,
      netIncome,
      expensesByCategory,
      invoiceCounts,
      paymentsCount: payments.length,
    };
  });
