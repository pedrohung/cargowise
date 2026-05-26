import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { currentUserQueryOptions } from "@/hooks/useCurrentUser";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(currentUserQueryOptions),
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AppShell>
        <Outlet />
      </AppShell>
    </Suspense>
  );
}
