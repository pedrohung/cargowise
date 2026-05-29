
-- Enums
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'overdue', 'cancelled');
CREATE TYPE currency_code AS ENUM ('CUP', 'USD', 'MLC', 'EUR');
CREATE TYPE expense_category AS ENUM ('fuel', 'maintenance', 'tolls', 'salaries', 'parts', 'permits', 'food', 'lodging', 'other');

-- Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- INVOICES
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE DEFAULT ('FC-' || lpad(nextval('invoice_number_seq')::text, 6, '0')),
  client_id UUID NOT NULL,
  order_id UUID,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status invoice_status NOT NULL DEFAULT 'draft',
  currency currency_code NOT NULL DEFAULT 'CUP',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT USAGE ON SEQUENCE invoice_number_seq TO authenticated;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view invoices" ON public.invoices FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant')
    OR EXISTS (SELECT 1 FROM clients c WHERE c.id = invoices.client_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "Staff insert invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant'));
CREATE POLICY "Staff update invoices" ON public.invoices FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant'));
CREATE POLICY "Admin delete invoices" ON public.invoices FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- INVOICE ITEMS
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items follow invoice access" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id));
CREATE POLICY "Staff insert invoice items" ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant'));
CREATE POLICY "Staff update invoice items" ON public.invoice_items FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant'));
CREATE POLICY "Staff delete invoice items" ON public.invoice_items FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant'));

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  client_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency currency_code NOT NULL DEFAULT 'CUP',
  method payment_method NOT NULL DEFAULT 'cash',
  reference TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID NOT NULL DEFAULT auth.uid(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view payments" ON public.payments FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant')
    OR EXISTS (SELECT 1 FROM clients c WHERE c.id = payments.client_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "Staff insert payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant'));
CREATE POLICY "Admin delete payments" ON public.payments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- EXPENSES
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category expense_category NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency currency_code NOT NULL DEFAULT 'CUP',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  receipt_url TEXT,
  recorded_by UUID NOT NULL DEFAULT auth.uid(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View expenses by role" ON public.expenses FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant')
    OR driver_id = auth.uid() OR recorded_by = auth.uid()
  );
CREATE POLICY "Insert expenses by role" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant')
    OR has_role(auth.uid(), 'driver')
  );
CREATE POLICY "Update expenses by staff" ON public.expenses FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant'));
CREATE POLICY "Admin delete expenses" ON public.expenses FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER expenses_updated BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: keep invoice totals in sync with payments
CREATE OR REPLACE FUNCTION public.sync_invoice_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv_id UUID;
  paid NUMERIC;
  inv_total NUMERIC;
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF inv_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(amount), 0) INTO paid FROM payments WHERE invoice_id = inv_id;
  SELECT total INTO inv_total FROM invoices WHERE id = inv_id;

  UPDATE invoices SET
    amount_paid = paid,
    status = CASE
      WHEN paid >= inv_total AND inv_total > 0 THEN 'paid'::invoice_status
      WHEN status = 'paid' AND paid < inv_total THEN 'issued'::invoice_status
      ELSE status
    END,
    paid_at = CASE WHEN paid >= inv_total AND inv_total > 0 THEN now() ELSE NULL END
  WHERE id = inv_id;

  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER payments_sync_invoice
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment();
