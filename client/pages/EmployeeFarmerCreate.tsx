import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Tractor } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";

export default function EmployeeFarmerCreate() {
  const { token } = useAuth();
  const [form, setForm] = useState({
    prn_no: "",
    name: "",
    phone: "",
    district: "",
    village: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitFarmer = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!token) throw new Error("Session expired. Please login again.");

      const res = await fetch("/api/farmers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to create farmer");

      setMessage(`Farmer created: ${body.farmer.name}`);
      setForm({ prn_no: "", name: "", phone: "", district: "", village: "" });
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Add New Farmer</h1>
          <Link to="/employee/dashboard" className="btn btn-secondary bg-white text-slate-700 border border-slate-300">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        <form onSubmit={submitFarmer} className="glass-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Tractor className="w-5 h-5 text-emerald-600" /> Farmer Details
          </h2>

          <Input label="PRN No" value={form.prn_no} onChange={(value) => setForm((s) => ({ ...s, prn_no: value }))} required />
          <Input label="Farmer Name" value={form.name} onChange={(value) => setForm((s) => ({ ...s, name: value }))} required />
          <Input label="Phone" value={form.phone} onChange={(value) => setForm((s) => ({ ...s, phone: value }))} required />
          <Input label="District" value={form.district} onChange={(value) => setForm((s) => ({ ...s, district: value }))} required />
          <Input label="Village" value={form.village} onChange={(value) => setForm((s) => ({ ...s, village: value }))} required />

          {message && <p className="text-sm text-slate-600">{message}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Create Farmer"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
      />
    </label>
  );
}
