import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Province = {
  id: string;
  code: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
};

export type Municipality = {
  id: string;
  province_id: string;
  code: string;
  name: string;
};

export type ClientLocation = {
  id: string;
  owner_id: string;
  province_id: string;
  municipality_id: string;
  label: string;
  address_line: string;
  reference: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  location_type: "residential" | "commercial" | "warehouse" | "pickup_point" | "other";
  is_favorite: boolean;
  province?: { name: string; code: string } | null;
  municipality?: { name: string } | null;
};

export const listProvinces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("provinces")
      .select("id, code, name, latitude, longitude")
      .order("display_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as Province[];
  });

export const listMunicipalities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("municipalities")
      .select("id, province_id, code, name")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Municipality[];
  });

export const listClientLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("client_locations")
      .select(
        "*, province:provinces(name, code), municipality:municipalities(name)"
      )
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ClientLocation[];
  });

const locationInput = z.object({
  province_id: z.string().uuid(),
  municipality_id: z.string().uuid(),
  label: z.string().min(1).max(120),
  address_line: z.string().min(1).max(300),
  reference: z.string().max(300).optional().nullable(),
  contact_name: z.string().max(120).optional().nullable(),
  contact_phone: z.string().max(40).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  location_type: z
    .enum(["residential", "commercial", "warehouse", "pickup_point", "other"])
    .default("residential"),
  is_favorite: z.boolean().default(false),
});

export const createClientLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => locationInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("client_locations")
      .insert({ ...data, owner_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateClientLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    locationInput.partial().extend({ id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("client_locations")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteClientLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("client_locations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
