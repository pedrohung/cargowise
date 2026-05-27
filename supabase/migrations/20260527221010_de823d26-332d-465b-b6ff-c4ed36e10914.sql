
-- PROVINCES
CREATE TABLE public.provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.provinces TO authenticated;
GRANT ALL ON public.provinces TO service_role;

ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read provinces" ON public.provinces
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage provinces" ON public.provinces
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- MUNICIPALITIES
CREATE TABLE public.municipalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (province_id, code)
);

CREATE INDEX idx_municipalities_province ON public.municipalities(province_id);

GRANT SELECT ON public.municipalities TO authenticated;
GRANT ALL ON public.municipalities TO service_role;

ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read municipalities" ON public.municipalities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage municipalities" ON public.municipalities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CLIENT LOCATIONS
CREATE TYPE public.location_type AS ENUM ('residential','commercial','warehouse','pickup_point','other');

CREATE TABLE public.client_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  province_id UUID NOT NULL REFERENCES public.provinces(id),
  municipality_id UUID NOT NULL REFERENCES public.municipalities(id),
  label TEXT NOT NULL,
  address_line TEXT NOT NULL,
  reference TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  location_type public.location_type NOT NULL DEFAULT 'residential',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_locations_owner ON public.client_locations(owner_id);
CREATE INDEX idx_client_locations_municipality ON public.client_locations(municipality_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_locations TO authenticated;
GRANT ALL ON public.client_locations TO service_role;

ALTER TABLE public.client_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own locations" ON public.client_locations
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Users insert own locations" ON public.client_locations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users update own locations" ON public.client_locations
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own locations" ON public.client_locations
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_client_locations_updated_at
  BEFORE UPDATE ON public.client_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEED PROVINCES (16 provincias de Cuba)
INSERT INTO public.provinces (code, name, latitude, longitude, display_order) VALUES
  ('PRI', 'Pinar del Río',     22.4175, -83.6981, 1),
  ('ART', 'Artemisa',          22.8131, -82.7592, 2),
  ('HAB', 'La Habana',         23.1136, -82.3666, 3),
  ('MAY', 'Mayabeque',         22.9000, -82.1500, 4),
  ('MAT', 'Matanzas',          23.0411, -81.5775, 5),
  ('VCL', 'Villa Clara',       22.4069, -79.9647, 6),
  ('CFG', 'Cienfuegos',        22.1500, -80.4333, 7),
  ('SSP', 'Sancti Spíritus',   21.9297, -79.4422, 8),
  ('CAV', 'Ciego de Ávila',    21.8403, -78.7619, 9),
  ('CMG', 'Camagüey',          21.3808, -77.9169, 10),
  ('LTU', 'Las Tunas',         20.9619, -76.9514, 11),
  ('HOL', 'Holguín',           20.8872, -76.2631, 12),
  ('GRA', 'Granma',            20.3858, -76.6431, 13),
  ('SCU', 'Santiago de Cuba',  20.0247, -75.8219, 14),
  ('GTM', 'Guantánamo',        20.1444, -75.2092, 15),
  ('IJV', 'Isla de la Juventud', 21.7561, -82.8214, 16);
