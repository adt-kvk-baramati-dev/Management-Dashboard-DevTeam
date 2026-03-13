import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LayoutDashboard, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";

export default function PortalLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn(email, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.role === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/employee/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="max-w-md w-full glass-panel p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">KVK Portal Login</h1>
          <p className="text-slate-500 mt-2 text-sm">No registration page - accounts are created by admin only</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 animate-fade-in text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@kvk.in"
                required
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Log In to Dashboard"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Access required? Contact admin to create your employee account.
        </div>

        <div className="mt-4 text-center">
          <Link to="/portal" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">← Back to Portal Home</Link>
        </div>
      </div>
    </div>
  );
}
