import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "operator" | "accountant" | "driver" | "client";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  accountant: "Contador",
  driver: "Chofer",
  client: "Cliente",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Control total: usuarios, configuración, finanzas y operaciones.",
  operator: "Pedidos, clientes, flota, tracking e inventario.",
  accountant: "Facturación, pagos, gastos y reportes financieros.",
  driver: "App de chofer: pedidos asignados y envío de GPS.",
  client: "Portal de cliente: sus pedidos y puntos de entrega.",
};

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  roles: AppRole[];
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Solo los administradores pueden gestionar usuarios.");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw new Error(error.message);

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, phone"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const roleMap = new Map<string, AppRole[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      roleMap.set(r.user_id, arr);
    }

    return list.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name: profileMap.get(u.id)?.full_name ?? null,
      phone: profileMap.get(u.id)?.phone ?? null,
      roles: roleMap.get(u.id) ?? [],
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed: Boolean(u.email_confirmed_at),
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      roles: AppRole[];
    }) => {
      if (!input.email?.includes("@")) throw new Error("Correo inválido.");
      if (!input.password || input.password.length < 8)
        throw new Error("La contraseña debe tener al menos 8 caracteres.");
      if (!input.full_name?.trim()) throw new Error("El nombre es obligatorio.");
      if (!input.roles?.length) throw new Error("Selecciona al menos un rol.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name.trim() },
    });
    if (error) throw new Error(error.message);
    const userId = created.user!.id;

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: data.full_name.trim(), phone: data.phone ?? null });

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert(data.roles.map((role) => ({ user_id: userId, role })));
    if (roleError) throw new Error(roleError.message);

    return { id: userId };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      full_name: string;
      phone?: string;
      password?: string;
      roles: AppRole[];
    }) => {
      if (!input.id) throw new Error("Usuario inválido.");
      if (!input.roles?.length) throw new Error("Selecciona al menos un rol.");
      if (input.password && input.password.length < 8)
        throw new Error("La contraseña debe tener al menos 8 caracteres.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.id === context.userId && !data.roles.includes("admin")) {
      throw new Error("No puedes quitarte a ti mismo el rol de administrador.");
    }

    if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: data.id, full_name: data.full_name.trim(), phone: data.phone ?? null });

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert(data.roles.map((role) => ({ user_id: data.id, role })));
    if (roleError) throw new Error(roleError.message);

    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId) throw new Error("No puedes eliminar tu propia cuenta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
