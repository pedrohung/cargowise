import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ORDER_STATUSES = [
  "draft",
  "pending",
  "confirmed",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PACKAGE_TYPES = [
  "document",
  "small_package",
  "medium_package",
  "large_package",
  "pallet",
  "refrigerated",
  "fragile",
] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

export const PAYMENT_METHODS = ["cash", "transfer", "credit", "prepaid"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type Order = {
  id: string;
  order_number: string;
  client_id: string;
  created_by: string;
  origin_location_id: string | null;
  destination_location_id: string | null;
  origin_address: string;
  destination_address: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  driver_id: string | null;
  vehicle_id: string | null;
  status: OrderStatus;
  scheduled_pickup_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  distance_km: number | null;
  estimated_duration_minutes: number | null;
  base_cost: number;
  total_cost: number;
  payment_method: PaymentMethod;
  is_paid: boolean;
  recipient_name: string | null;
  recipient_phone: string | null;
  notes: string | null;
  tracking_code: string;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string; is_company: boolean } | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  description: string;
  package_type: PackageType;
  quantity: number;
  weight_kg: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  declared_value: number | null;
};

export type OrderHistoryEntry = {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
};

const itemInput = z.object({
  description: z.string().min(1).max(200),
  package_type: z.enum(PACKAGE_TYPES).default("small_package"),
  quantity: z.number().int().min(1).default(1),
  weight_kg: z.number().min(0).optional().nullable(),
  length_cm: z.number().min(0).optional().nullable(),
  width_cm: z.number().min(0).optional().nullable(),
  height_cm: z.number().min(0).optional().nullable(),
  declared_value: z.number().min(0).optional().nullable(),
});

const orderInput = z.object({
  client_id: z.string().uuid(),
  origin_location_id: z.string().uuid().optional().nullable(),
  destination_location_id: z.string().uuid().optional().nullable(),
  origin_address: z.string().min(1).max(400),
  destination_address: z.string().min(1).max(400),
  origin_lat: z.number().optional().nullable(),
  origin_lng: z.number().optional().nullable(),
  destination_lat: z.number().optional().nullable(),
  destination_lng: z.number().optional().nullable(),
  driver_id: z.string().uuid().optional().nullable(),
  vehicle_id: z.string().uuid().optional().nullable(),
  status: z.enum(ORDER_STATUSES).default("pending"),
  scheduled_pickup_at: z.string().datetime().optional().nullable(),
  distance_km: z.number().min(0).optional().nullable(),
  base_cost: z.number().min(0).default(0),
  total_cost: z.number().min(0).default(0),
  payment_method: z.enum(PAYMENT_METHODS).default("cash"),
  recipient_name: z.string().max(160).optional().nullable(),
  recipient_phone: z.string().max(40).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(itemInput).default([]),
});

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*, client:clients(id, name, is_company)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as Order[];
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: order, error }, { data: items }, { data: history }] = await Promise.all([
      context.supabase
        .from("orders")
        .select("*, client:clients(id, name, is_company)")
        .eq("id", data.id)
        .single(),
      context.supabase.from("order_items").select("*").eq("order_id", data.id),
      context.supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (error) throw new Error(error.message);
    return {
      order: order as Order,
      items: (items ?? []) as OrderItem[],
      history: (history ?? []) as OrderHistoryEntry[],
    };
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => orderInput.parse(input))
  .handler(async ({ data, context }) => {
    const { items, ...orderData } = data;
    const { data: order, error } = await context.supabase
      .from("orders")
      .insert({ ...orderData, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (items.length > 0) {
      const { error: iErr } = await context.supabase
        .from("order_items")
        .insert(items.map((i) => ({ ...i, order_id: order.id })));
      if (iErr) throw new Error(iErr.message);
    }
    return order;
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(ORDER_STATUSES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "picked_up") patch.picked_up_at = new Date().toISOString();
    if (data.status === "delivered") patch.delivered_at = new Date().toISOString();
    const { error } = await context.supabase.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        driver_id: z.string().uuid().nullable(),
        vehicle_id: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      driver_id: data.driver_id,
      vehicle_id: data.vehicle_id,
    };
    if (data.driver_id) patch.status = "assigned";
    const { error } = await context.supabase.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
