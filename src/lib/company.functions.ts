import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CompanyConfig = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  tax_id: string | null;
  address: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  territorial_contribution_rate: number;
  is_iva_registered: boolean;
  transfermovil_qr_url: string | null;
  enzona_qr_url: string | null;
  invoice_prefix: string;
  invoice_footer_text: string | null;
  default_currency: string;
  default_usd_exchange_rate: number;
  default_diesel_price: number;
  wizard_completed: boolean;
  created_at: string;
  updated_at: string;
};

export const getCompanyConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("company_config")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as CompanyConfig | null;
  });

const updateInput = z.object({
  legal_name: z.string().min(1).max(200).optional(),
  trade_name: z.string().max(200).optional().nullable(),
  tax_id: z.string().max(60).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  province: z.string().max(80).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  logo_url: z.string().url().optional().nullable().or(z.literal("")),
  territorial_contribution_rate: z.number().min(0).max(100).optional(),
  is_iva_registered: z.boolean().optional(),
  transfermovil_qr_url: z.string().url().optional().nullable().or(z.literal("")),
  enzona_qr_url: z.string().url().optional().nullable().or(z.literal("")),
  invoice_prefix: z.string().max(20).optional(),
  invoice_footer_text: z.string().max(500).optional().nullable(),
  default_currency: z.enum(["CUP", "USD", "MLC", "EUR"]).optional(),
  default_usd_exchange_rate: z.number().min(1).optional(),
  default_diesel_price: z.number().min(0).optional(),
  wizard_completed: z.boolean().optional(),
});

export const updateCompanyConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("company_config")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (!existing) throw new Error("Configuración no inicializada");

    // Normalize empty strings to null
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      payload[k] = v === "" ? null : v;
    }

    const { data: updated, error } = await context.supabase
      .from("company_config")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated as CompanyConfig;
  });
