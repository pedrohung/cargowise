
-- Enums
CREATE TYPE public.order_status AS ENUM ('draft','pending','confirmed','assigned','picked_up','in_transit','delivered','cancelled','returned');
CREATE TYPE public.package_type AS ENUM ('document','small_package','medium_package','large_package','pallet','refrigerated','fragile');
CREATE TYPE public.payment_method AS ENUM ('cash','transfer','credit','prepaid');
CREATE TYPE public.vehicle_type AS ENUM ('motorcycle','car','van','truck_small','truck_medium','truck_large');
CREATE TYPE public.vehicle_status AS ENUM ('available','in_route','maintenance','inactive');

-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_company boolean NOT NULL DEFAULT false,
  tax_id text,
  email text,
  phone text,
  contact_name text,
  credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view clients" ON public.clients FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator') OR has_role(auth.uid(),'accountant') OR owner_id = auth.uid());
CREATE POLICY "Staff insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator'));
CREATE POLICY "Staff update clients" ON public.clients FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator'));
CREATE POLICY "Admins delete clients" ON public.clients FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ VEHICLES ============
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL UNIQUE,
  brand text,
  model text,
  year integer,
  vehicle_type public.vehicle_type NOT NULL DEFAULT 'van',
  capacity_kg numeric(10,2),
  capacity_m3 numeric(10,2),
  driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.vehicle_status NOT NULL DEFAULT 'available',
  fuel_level integer CHECK (fuel_level BETWEEN 0 AND 100),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view vehicles" ON public.vehicles FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator') OR has_role(auth.uid(),'accountant') OR driver_id = auth.uid());
CREATE POLICY "Staff manage vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator'));

CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ORDERS ============
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1000;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('LC-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  origin_location_id uuid REFERENCES public.client_locations(id),
  destination_location_id uuid REFERENCES public.client_locations(id),
  origin_address text NOT NULL,
  destination_address text NOT NULL,
  origin_lat numeric, origin_lng numeric,
  destination_lat numeric, destination_lng numeric,
  driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  scheduled_pickup_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  distance_km numeric(10,2),
  estimated_duration_minutes integer,
  base_cost numeric(12,2) DEFAULT 0,
  total_cost numeric(12,2) DEFAULT 0,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  is_paid boolean NOT NULL DEFAULT false,
  recipient_name text,
  recipient_phone text,
  notes text,
  tracking_code text NOT NULL DEFAULT encode(gen_random_bytes(6),'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View orders by role" ON public.orders FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator') OR has_role(auth.uid(),'accountant')
    OR driver_id = auth.uid() OR created_by = auth.uid()
  );
CREATE POLICY "Staff insert orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator') OR has_role(auth.uid(),'client'));
CREATE POLICY "Update orders by role" ON public.orders FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator') OR driver_id = auth.uid());
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_driver ON public.orders(driver_id);
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ORDER ITEMS ============
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  package_type public.package_type NOT NULL DEFAULT 'small_package',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  weight_kg numeric(10,2),
  length_cm numeric(8,2), width_cm numeric(8,2), height_cm numeric(8,2),
  declared_value numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items follow order access" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));
CREATE POLICY "Items insert with order" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));
CREATE POLICY "Items update with order" ON public.order_items FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator'));
CREATE POLICY "Items delete with order" ON public.order_items FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator'));

-- ============ ORDER STATUS HISTORY ============
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status,
  to_status public.order_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "History follows order access" ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));
CREATE POLICY "History insert" ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_orders_status_log AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- ============ VEHICLE LOCATIONS (GPS pings) ============
CREATE TABLE public.vehicle_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  speed_kmh numeric(6,2),
  heading numeric(5,2),
  accuracy_m numeric(8,2),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.vehicle_locations TO authenticated;
GRANT ALL ON public.vehicle_locations TO service_role;
ALTER TABLE public.vehicle_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View vehicle locations" ON public.vehicle_locations FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator') OR driver_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.created_by = auth.uid() OR o.driver_id = auth.uid())));
CREATE POLICY "Drivers insert own location" ON public.vehicle_locations FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator'));

CREATE INDEX idx_vehicle_loc_vehicle_time ON public.vehicle_locations(vehicle_id, recorded_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_locations;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.vehicle_locations REPLICA IDENTITY FULL;
