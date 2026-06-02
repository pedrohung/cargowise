-- Enums
CREATE TYPE part_category AS ENUM ('engine', 'tires', 'electrical', 'body', 'fluids', 'filters', 'brakes', 'suspension', 'consumables', 'other');
CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment');
CREATE TYPE maintenance_type AS ENUM ('preventive', 'corrective', 'inspection', 'tire_change', 'oil_change', 'other');
CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- ============ PARTS ============
CREATE TABLE public.parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category part_category NOT NULL DEFAULT 'other',
  unit TEXT NOT NULL DEFAULT 'unidad',
  stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  currency currency_code NOT NULL DEFAULT 'CUP',
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts TO authenticated;
GRANT ALL ON public.parts TO service_role;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view parts" ON public.parts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant') OR has_role(auth.uid(), 'driver'));

CREATE POLICY "Staff insert parts" ON public.parts FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Staff update parts" ON public.parts FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Admins delete parts" ON public.parts FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_parts_updated_at BEFORE UPDATE ON public.parts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ STOCK MOVEMENTS ============
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_id UUID NOT NULL,
  movement_type stock_movement_type NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC,
  reason TEXT,
  reference TEXT,
  recorded_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view stock movements" ON public.stock_movements FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant'));

CREATE POLICY "Staff insert stock movements" ON public.stock_movements FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- Trigger: apply stock movement to parts.stock
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE parts SET stock = stock + NEW.quantity WHERE id = NEW.part_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE parts SET stock = stock - NEW.quantity WHERE id = NEW.part_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE parts SET stock = NEW.quantity WHERE id = NEW.part_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_apply_stock_movement AFTER INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- ============ MAINTENANCE RECORDS ============
CREATE TABLE public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  maintenance_type maintenance_type NOT NULL DEFAULT 'preventive',
  status maintenance_status NOT NULL DEFAULT 'scheduled',
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  odometer_km NUMERIC,
  next_service_km NUMERIC,
  next_service_date DATE,
  description TEXT NOT NULL,
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  parts_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  currency currency_code NOT NULL DEFAULT 'CUP',
  performed_by TEXT,
  workshop TEXT,
  notes TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;
GRANT ALL ON public.maintenance_records TO service_role;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View maintenance" ON public.maintenance_records FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'accountant')
  OR EXISTS (SELECT 1 FROM vehicles v WHERE v.id = maintenance_records.vehicle_id AND v.driver_id = auth.uid())
);

CREATE POLICY "Staff insert maintenance" ON public.maintenance_records FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Staff update maintenance" ON public.maintenance_records FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Admins delete maintenance" ON public.maintenance_records FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_maintenance_updated_at BEFORE UPDATE ON public.maintenance_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MAINTENANCE PARTS (piezas usadas) ============
CREATE TABLE public.maintenance_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID NOT NULL,
  part_id UUID NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.maintenance_parts TO authenticated;
GRANT ALL ON public.maintenance_parts TO service_role;
ALTER TABLE public.maintenance_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View maintenance parts" ON public.maintenance_parts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM maintenance_records m WHERE m.id = maintenance_parts.maintenance_id));

CREATE POLICY "Staff insert maintenance parts" ON public.maintenance_parts FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Staff delete maintenance parts" ON public.maintenance_parts FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- Trigger: al añadir piezas a un mantenimiento, descuenta stock y actualiza parts_cost del mantenimiento
CREATE OR REPLACE FUNCTION public.apply_maintenance_part()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_parts NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Descontar inventario
    INSERT INTO stock_movements (part_id, movement_type, quantity, unit_cost, reason, reference, recorded_by)
    VALUES (NEW.part_id, 'out', NEW.quantity, NEW.unit_cost, 'Uso en mantenimiento', NEW.maintenance_id::text, auth.uid());
  END IF;

  -- Recalcular total de piezas en el mantenimiento
  SELECT COALESCE(SUM(total), 0) INTO total_parts
  FROM maintenance_parts WHERE maintenance_id = COALESCE(NEW.maintenance_id, OLD.maintenance_id);

  UPDATE maintenance_records SET
    parts_cost = total_parts,
    total_cost = labor_cost + total_parts
  WHERE id = COALESCE(NEW.maintenance_id, OLD.maintenance_id);

  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_apply_maintenance_part AFTER INSERT OR DELETE ON public.maintenance_parts
FOR EACH ROW EXECUTE FUNCTION public.apply_maintenance_part();