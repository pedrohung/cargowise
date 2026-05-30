
CREATE TABLE public.company_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legal_name TEXT NOT NULL DEFAULT 'Mi Empresa',
  trade_name TEXT,
  tax_id TEXT,
  address TEXT,
  province TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  territorial_contribution_rate NUMERIC NOT NULL DEFAULT 0,
  is_iva_registered BOOLEAN NOT NULL DEFAULT false,
  transfermovil_qr_url TEXT,
  enzona_qr_url TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'FC-',
  invoice_footer_text TEXT,
  default_currency currency_code NOT NULL DEFAULT 'CUP',
  default_usd_exchange_rate NUMERIC NOT NULL DEFAULT 240,
  default_diesel_price NUMERIC NOT NULL DEFAULT 195,
  wizard_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.company_config TO authenticated;
GRANT ALL ON public.company_config TO service_role;

ALTER TABLE public.company_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view company config"
  ON public.company_config FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert company config"
  ON public.company_config FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update company config"
  ON public.company_config FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_company_config_updated_at
  BEFORE UPDATE ON public.company_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed single row
INSERT INTO public.company_config (legal_name) VALUES ('LogiCuba');

-- Storage bucket for logo & QR codes
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read company assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "Admins upload company assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update company assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete company assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));
