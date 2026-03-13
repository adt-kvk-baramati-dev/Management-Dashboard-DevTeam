import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, UserPlus, Tractor } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";

export default function AdminManagement() {
  const { token } = useAuth();
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    email: "",
    password: "",
    domain_expertise: "",
  });
  const [farmerForm, setFarmerForm] = useState({
    prn_no: "",
    name: "",
    phone: "",
    district: "",
    village: "",
  });
  const [employeeMessage, setEmployeeMessage] = useState<string | null>(null);
  const [farmerMessage, setFarmerMessage] = useState<string | null>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [loadingFarmer, setLoadingFarmer] = useState(false);

  const createEmployee = async (e: FormEvent) => {
    e.preventDefault();
    setLoadingEmployee(true);
    setEmployeeMessage(null);
    try {
      if (!token) throw new Error("Session expired. Please login again.");

      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(employeeForm),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to create employee");

      setEmployeeMessage(`Employee created: ${body.employee.email}`);
      setEmployeeForm({ name: "", email: "", password: "", domain_expertise: "" });
    } catch (error: any) {
      setEmployeeMessage(error.message);
    } finally {
      setLoadingEmployee(false);
    }
  };

  const createFarmer = async (e: FormEvent) => {
    e.preventDefault();
    setLoadingFarmer(true);
    setFarmerMessage(null);
    try {
      if (!token) throw new Error("Session expired. Please login again.");

      const res = await fetch("/api/farmers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(farmerForm),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to create farmer");

      setFarmerMessage(`Farmer created: ${body.farmer.name}`);
      setFarmerForm({ prn_no: "", name: "", phone: "", district: "", village: "" });
    } catch (error: any) {
      setFarmerMessage(error.message);
    } finally {
      setLoadingFarmer(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Admin User & Farmer Management</h1>
          <Link to="/admin/dashboard" className="btn btn-secondary bg-white text-slate-700 border border-slate-300">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={createEmployee} className="glass-panel p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" /> Add New Employee (Admin Only)
            </h2>
            <Input label="Name" value={employeeForm.name} onChange={(value) => setEmployeeForm((s) => ({ ...s, name: value }))} required />
            <Input label="Email" type="email" value={employeeForm.email} onChange={(value) => setEmployeeForm((s) => ({ ...s, email: value }))} required />
            <Input label="Password" type="password" value={employeeForm.password} onChange={(value) => setEmployeeForm((s) => ({ ...s, password: value }))} required />
            <Input label="Domain Expertise" value={employeeForm.domain_expertise} onChange={(value) => setEmployeeForm((s) => ({ ...s, domain_expertise: value }))} />
            {employeeMessage && <p className="text-sm text-slate-600">{employeeMessage}</p>}
            <button className="btn btn-primary" type="submit" disabled={loadingEmployee}>{loadingEmployee ? "Creating..." : "Create Employee"}</button>
          </form>

          <form onSubmit={createFarmer} className="glass-panel p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Tractor className="w-5 h-5 text-emerald-600" /> Add New Farmer (Admin/Employee)
            </h2>
            <Input label="PRN No" value={farmerForm.prn_no} onChange={(value) => setFarmerForm((s) => ({ ...s, prn_no: value }))} required />
            <Input label="Farmer Name" value={farmerForm.name} onChange={(value) => setFarmerForm((s) => ({ ...s, name: value }))} required />
            <Input label="Phone" value={farmerForm.phone} onChange={(value) => setFarmerForm((s) => ({ ...s, phone: value }))} required />
            <Input label="District" value={farmerForm.district} onChange={(value) => setFarmerForm((s) => ({ ...s, district: value }))} required />
            <Input label="Village" value={farmerForm.village} onChange={(value) => setFarmerForm((s) => ({ ...s, village: value }))} required />
            {farmerMessage && <p className="text-sm text-slate-600">{farmerMessage}</p>}
            <button className="btn btn-primary" type="submit" disabled={loadingFarmer}>{loadingFarmer ? "Creating..." : "Create Farmer"}</button>
          </form>
        </div>
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
