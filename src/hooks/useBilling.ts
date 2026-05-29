import { queryOptions } from "@tanstack/react-query";
import {
  listInvoices,
  getInvoice,
  listExpenses,
  listPayments,
  getFinancialSummary,
} from "@/lib/billing.functions";

export const invoicesQueryOptions = queryOptions({
  queryKey: ["invoices"],
  queryFn: () => listInvoices(),
  staleTime: 1000 * 15,
});

export const invoiceQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["invoices", id],
    queryFn: () => getInvoice({ data: { id } }),
    staleTime: 1000 * 10,
  });

export const expensesQueryOptions = queryOptions({
  queryKey: ["expenses"],
  queryFn: () => listExpenses(),
  staleTime: 1000 * 15,
});

export const paymentsQueryOptions = queryOptions({
  queryKey: ["payments"],
  queryFn: () => listPayments(),
  staleTime: 1000 * 15,
});

export const financialSummaryQueryOptions = queryOptions({
  queryKey: ["financial-summary"],
  queryFn: () => getFinancialSummary(),
  staleTime: 1000 * 30,
});
