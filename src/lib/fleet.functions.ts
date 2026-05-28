import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Vehicle = {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  vehicle_type: "motorcycle" | "car" | "van" | "truck_small" | "truck_medium" | "truck_large";
  capacity_kg: number | null;
  capacity_m3: number | null;
  driver_id: string | null;
  status: "available" | "in_route" | "maintenance" | "inactive";
  fuel_level: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Driver = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
};

export type VehicleLocation = {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  order_id: string | null;
  latitude: number;
  longitude: number;
  speed_kmh: number | null;
  heading: number | null;
  recorded_at: string;
};

const vehicleInput = z.object({
  plate: z.string().min(1).max(20),
  brand: z.string().max(60).optional().nullable(),
  model: z.string().max(60).optional().nullable(),
  year: z.number().int().min(1950).max(2100).optional().nullable(),
  vehicle_type: z.enum(["motorcycle", "car", "van", "truck_small", "truck_medium", "truck_large"]),
  capacity_kg: z.number().min(0).optional().nullable(),
  capacity_m3: z.number().min(0).optional().nullable(),
  driver_id: z.string().uuid().optional().nullable(),
  status: z.enum(["available", "in_route", "maintenance", "inactive"]).default("available"),
  fuel_level: z.number().int().min(0).max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const listVehicles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vehicles")
      .select("*")
      .order("plate");
    if (error) throw new Error(error.message);
    return (data ?? []) as Vehicle[];
  });

export const createVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => vehicleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("vehicles")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    vehicleInput.partial().extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("vehicles").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("vehicles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Drivers: list users with the "driver" role. Uses admin client to read
// profiles across users; gated by the requester's role server-side.
export const listDrivers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { data: rolesRow } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const myRoles = (rolesRow ?? []).map((r) => r.role);
    const isStaff = myRoles.includes("admin") || myRoles.includes("operator");
    if (!isStaff) return [] as Driver[];

    const { data: driverRoles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "driver");
    if (error) throw new Error(error.message);
    const ids = (driverRoles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [] as Driver[];

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    return (profiles ?? []).map((p) => ({
      user_id: p.id,
      full_name: p.full_name,
      phone: p.phone,
    })) as Driver[];
  });

// Latest known position for each vehicle (RLS filters per role)
export const listLatestVehicleLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vehicle_locations")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const latest = new Map<string, VehicleLocation>();
    for (const row of (data ?? []) as VehicleLocation[]) {
      if (!latest.has(row.vehicle_id)) latest.set(row.vehicle_id, row);
    }
    return Array.from(latest.values());
  });

export const recordVehiclePing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        vehicle_id: z.string().uuid(),
        order_id: z.string().uuid().optional().nullable(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        speed_kmh: z.number().min(0).max(400).optional().nullable(),
        heading: z.number().min(0).max(360).optional().nullable(),
        accuracy_m: z.number().min(0).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("vehicle_locations").insert({
      ...data,
      driver_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
