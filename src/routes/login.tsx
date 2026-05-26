import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth/LoginForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — LogiCuba" },
      { name: "description", content: "Accede al panel de operaciones logísticas." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="min-h-screen relative grid place-items-center px-4 bg-background overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}
