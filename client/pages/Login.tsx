import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sprout } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    const role = result.role;
    if (role === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/employee/dashboard");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 backdrop-blur-md bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">KVK Digital</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Login Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center">
                <Sprout className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400">Sign in to KVK Digital Intelligence</p>
          </div>

          {/* Card */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-2xl p-8 backdrop-blur-md">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-700/30 border-slate-600 text-white placeholder-slate-500 h-11 rounded-lg"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-700/30 border-slate-600 text-white placeholder-slate-500 h-11 rounded-lg"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors duration-200"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              {/* Demo Info */}
              <div className="bg-slate-700/20 border border-slate-600/50 rounded-lg p-4 mt-6">
                <p className="text-xs text-slate-400 mb-2 font-semibold">Demo Credentials:</p>
                <p className="text-xs text-slate-400 mb-1">
                  <span className="text-slate-300">Email:</span> created by admin only
                </p>
                <p className="text-xs text-slate-400">
                  <span className="text-slate-300">Password:</span> provided by admin
                </p>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                New to KVK Digital?{" "}
                <span className="text-emerald-400 font-semibold">Contact Administrator for Access</span>
              </p>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-slate-400 hover:text-slate-300 text-sm transition"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
