import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MaintenanceType = "preventive" | "corrective" | "inspection" | "tire_change" | "oil_change" | "other";
export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type MaintenanceRecord = {
  id: string;
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  status: MaintenanceStatus;
  scheduled_date: string | null;
  completed_at: string | null;
  odometer_km: number | null;
  next_service_km: number | null;
  next_service_date: string | null;
  description: string;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  currency: "CUP" | "USD" | "MLC" | "EUR";
  performed_by: string | null;
  workshop: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenancePart = {
  id: string;
  maintenance_id: string;
  part_id: string;
  quantity: number;
  unit_cost: number;
  total: number;
};

const maintInput = z.object({
  vehicle_id: z.string().uuid(),
  maintenance_type: z.enum(["preventive","corrective","inspection","tire_change","oil_change","other"]),
  status: z.enum(["scheduled","in_progress","completed","cancelled"]).default("scheduled"),
  scheduled_date: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  odometer_km: z.number().min(0).optional().nullable(),
  next_service_km: z.number().min(0).optional().nullable(),
  next_service_date: z.string().optional().nullable(),
  description: z.string().min(1).max(500),
  labor_cost: z.number().min(0).default(0),
  currency: z.enum(["CUP","USD","MLC","EUR"]).default("CUP"),
  performed_by: z.string().max(120).optional().nullable(),
  workshop: z.string().max(120).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const listMaintenance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("maintenance_records")
      .select("*")
      .order("scheduled_date", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as MaintenanceRecord[];
  });

export const createMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => maintInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("maintenance_records")
      .insert({ ...data, total_cost: data.labor_cost })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => maintInput.partial().extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("maintenance_records").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("maintenance_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMaintenanceParts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ maintenance_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("maintenance_parts")
      .select("*")
      .eq("maintenance_id", data.maintenance_id);
    if (error) throw new Error(error.message);
    return (rows ?? []) as MaintenancePart[];
  });

export const addMaintenancePart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      maintenance_id: z.string().uuid(),
      part_id: z.string().uuid(),
      quantity: z.number().min(0.01),
      unit_cost: z.number().min(0),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const total = data.quantity * data.unit_cost;
    const { error } = await context.supabase.from("maintenance_parts").insert({ ...data, total });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMaintenancePart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("maintenance_parts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
