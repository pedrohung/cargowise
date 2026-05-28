import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Client = {
  id: string;
  name: string;
  is_company: boolean;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  credit_limit: number;
  balance: number;
  notes: string | null;
  is_active: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

const clientInput = z.object({
  name: z.string().min(1).max(160),
  is_company: z.boolean().default(false),
  tax_id: z.string().max(40).optional().nullable(),
  email: z.string().email().max(160).optional().nullable().or(z.literal("").transform(() => null)),
  phone: z.string().max(40).optional().nullable(),
  contact_name: z.string().max(160).optional().nullable(),
  credit_limit: z.number().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Client[];
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => clientInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("clients")
      .insert({ ...data, owner_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    clientInput.partial().extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("clients").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
