import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sprout, ArrowRight, Leaf } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signIn(email, password);

    if (result.error) { setError(result.error); setIsLoading(false); return; }
    if (!result.role)  { setError("Unable to determine account role. Please contact an admin."); setIsLoading(false); return; }

    navigate(result.role === "admin" ? "/admin/dashboard" : "/employee/dashboard");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-[hsl(90_22%_97%)]">

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, hsl(116 55% 16%) 0%, hsl(116 48% 22%) 50%, hsl(112 44% 28%) 100%)" }}
      >
        {/* decorative circles */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-8 h-48 w-48 rounded-full bg-white/4" />

        {/* dot grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">AI ADT Foundation</span>
          </div>

          {/* Center content */}
          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/12 ring-1 ring-white/20">
              <Leaf className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Empowering Farmers Through Data
            </h1>
            <p className="text-white/65 text-base leading-relaxed">
              A unified platform for agricultural advisory, complaint management, and precision farming insights across Maharashtra.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[["10K+", "Farmers"], ["500+", "Complaints/mo"], ["98%", "Resolution"]].map(([val, label]) => (
                <div key={label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                  <p className="text-2xl font-bold text-white">{val}</p>
                  <p className="text-xs text-white/55 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/35 text-xs mt-auto">
            © {new Date().getFullYear()} AI ADT Foundation · Krishi Vigyan Kendra
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Sprout className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg text-foreground">AI ADT Foundation</span>
        </div>

        <div className="mx-auto w-full max-w-[380px]">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-1.5">Welcome back</h2>
            <p className="text-muted-foreground text-sm">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/8 p-3.5 text-sm text-destructive">
                <span className="mt-0.5 shrink-0 text-base">⚠</span>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
              <Input
                type="email"
                placeholder="official@kvk.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-border/70 bg-muted/30 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl border-border/70 bg-muted/30 focus:bg-white"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 h-11 w-full rounded-xl text-sm font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Authenticating…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/" className="text-sm font-medium text-primary hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
