import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";

type Mode = "signin" | "signup";

export function LoginForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido de vuelta");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu correo para confirmar.");
        setMode("signin");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Algo salió mal";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/dashboard`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error con Google";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="glass rounded-2xl p-8 shadow-[var(--shadow-elevated)]">
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 ring-1 ring-primary/30 grid place-items-center">
              <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)]" />
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              LogiCuba · Operations
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Acceder al panel" : "Crear cuenta"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin"
              ? "Introduce tus credenciales para continuar."
              : "Regístrate para empezar a operar."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Juan Pérez"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@empresa.cu"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="pl-9"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">o</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
          disabled={loading}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-primary hover:underline font-medium"
          >
            {mode === "signin" ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}
