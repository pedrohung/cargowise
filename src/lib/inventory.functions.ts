import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PartCategory =
  | "engine" | "tires" | "electrical" | "body" | "fluids"
  | "filters" | "brakes" | "suspension" | "consumables" | "other";

export type Part = {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: PartCategory;
  unit: string;
  stock: number;
  min_stock: number;
  unit_cost: number;
  currency: "CUP" | "USD" | "MLC" | "EUR";
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StockMovement = {
  id: string;
  part_id: string;
  movement_type: "in" | "out" | "adjustment";
  quantity: number;
  unit_cost: number | null;
  reason: string | null;
  reference: string | null;
  recorded_by: string;
  created_at: string;
};

const partInput = z.object({
  sku: z.string().max(60).optional().nullable(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  category: z.enum([
    "engine","tires","electrical","body","fluids",
    "filters","brakes","suspension","consumables","other",
  ]),
  unit: z.string().min(1).max(20).default("unidad"),
  min_stock: z.number().min(0).default(0),
  unit_cost: z.number().min(0).default(0),
  currency: z.enum(["CUP","USD","MLC","EUR"]).default("CUP"),
  location: z.string().max(120).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const listParts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("parts")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Part[];
  });

export const createPart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => partInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("parts")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updatePart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => partInput.partial().extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("parts").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("parts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordStockMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      part_id: z.string().uuid(),
      movement_type: z.enum(["in", "out", "adjustment"]),
      quantity: z.number().min(0),
      unit_cost: z.number().min(0).optional().nullable(),
      reason: z.string().max(200).optional().nullable(),
      reference: z.string().max(120).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stock_movements").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStockMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("stock_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as StockMovement[];
  });
