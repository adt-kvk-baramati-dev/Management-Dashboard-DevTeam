import React, { useState, useEffect, useMemo } from "react";
import AdminLayout from "../components/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Download,
  X,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  Hash,
  Sprout,
  Maximize2,
  CalendarDays,
  RefreshCw,
  Filter,
  CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "../lib/AuthProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Farmer {
  id?: string;
  prn: string;
  prn_no?: string;
  name: string;
  phone: string;
  address?: string;
  village?: string;
  taluka?: string;
  district: string;
  state?: string;
  crop?: string;
  farmSize?: string;
  lastVisit?: string;
  // New optional fields (client-side only defaults applied when missing)
  planting_date?: string;
  season?: string;
  variety?: string;
  area?: string; // formatted string like "0.84"
}

type ModalMode = "add" | "edit";

const EMPTY_FORM = {
  prn_no: "",
  name: "",
  phone: "",
  district: "",
  village: "",
  taluka: "",
  state: "",
  crop: "",
  farmSize: "",
  planting_date: "",
  season: "",
  variety: "",
};

const PAGE_SIZES = [10, 25, 50, 100];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exportCSV(farmers: Farmer[]) {
  if (!farmers.length) return;
  const ws = XLSX.utils.json_to_sheet(farmers);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Farmers_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportExcel(farmers: Farmer[]) {
  if (!farmers.length) return;
  const ws = XLSX.utils.json_to_sheet(farmers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Farmers");
  XLSX.writeFile(wb, `Farmers_${new Date().toISOString().split("T")[0]}.xlsx`);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-outline-variant/20 last:border-0">
      <div className="mt-0.5 p-1.5 bg-primary/8 rounded-lg text-primary">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-0.5">{label}</p>
        <p className="text-sm font-medium text-on-surface truncate">{value}</p>
      </div>
    </div>
  );
}

function Badge({ children, color = "emerald" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] ?? colors.emerald}`}>
      {children}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminFarmers() {
  const { token } = useAuth();

  // Data
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & modals
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Farmer | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form
  const [farmerForm, setFarmerForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Table state
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [sortKey, setSortKey] = useState<keyof Farmer>("prn");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => { fetchFarmers(); }, [token]);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // ── API ────────────────────────────────────────────────────────────────────

  const fetchFarmers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/farmers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to fetch farmers");
      const raw: Farmer[] = json.farmers || [];
      const augmented = raw.map((f) => {
        const areaVal = f.area ?? (Math.random() * (0.99 - 0.7) + 0.7);
        return {
          ...f,
          planting_date: f.planting_date ?? "15-07-2025",
          season: f.season ?? "Kharif 2025",
          variety: f.variety ?? "CO 86032",
          // store area as formatted string to keep sorting/display consistent
          area: (typeof areaVal === "string" ? areaVal : areaVal.toFixed(2)),
        } as Farmer;
      });
      setFarmers(augmented);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const isEdit = modalMode === "edit";
      const url = isEdit
        ? `/api/farmers/${selectedFarmer?.id || selectedFarmer?.prn}`
        : "/api/farmers";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(farmerForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      setShowFormModal(false);
      setFarmerForm({ ...EMPTY_FORM });
      setSelectedFarmer(null);
      setSuccessMsg(isEdit ? "Farmer updated successfully." : "Farmer added successfully.");
      fetchFarmers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    const farmer = showDeleteConfirm;
    setDeleting(true);
    try {
      const identifier = farmer.id || farmer.prn;
      if (!identifier) throw new Error("No valid farmer identifier found.");

      console.log("Delete farmer:", { id: farmer.id, prn: farmer.prn, identifier });

      const res = await fetch(`/api/farmers/${encodeURIComponent(identifier)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);
      console.log("Delete response:", res.status, data);

      if (!res.ok) {
        throw new Error(data?.message || `Delete failed (${res.status})`);
      }

      setShowDeleteConfirm(null);
      setSelectedFarmer(null);
      setSuccessMsg(data?.message || "Farmer deleted successfully.");
      fetchFarmers();
    } catch (err: any) {
      console.error("Delete error:", err);
      // Close the modal so the error banner is visible to the user
      setShowDeleteConfirm(null);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const uniqueDistricts = useMemo(
    () => [...new Set(farmers.map((f) => f.district).filter(Boolean))].sort(),
    [farmers]
  );
  const uniqueStates = useMemo(
    () => [...new Set(farmers.map((f) => f.state).filter(Boolean))].sort(),
    [farmers]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return farmers
      .filter((f) => {
        const matchSearch =
          !q ||
          f.name?.toLowerCase().includes(q) ||
          f.prn?.toLowerCase().includes(q) ||
          f.phone?.toLowerCase().includes(q) ||
          f.address?.toLowerCase().includes(q) ||
          f.village?.toLowerCase().includes(q) ||
          // include planting date in search (formatted as dd-mm-yyyy)
          f.planting_date?.toLowerCase().includes(q);
        const matchDistrict = !districtFilter || f.district === districtFilter;
        const matchState = !stateFilter || f.state === stateFilter;
        return matchSearch && matchDistrict && matchState;
      })
      .sort((a, b) => {
        const av = (a[sortKey] ?? "") as string;
        const bv = (b[sortKey] ?? "") as string;
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [farmers, search, districtFilter, stateFilter, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: keyof Farmer) => {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  };

  const SortIndicator = ({ col }: { col: keyof Farmer }) =>
    sortKey === col ? (
      <span className="ml-1 opacity-70">{sortAsc ? "↑" : "↓"}</span>
    ) : null;

  // ── Open modal helpers ──────────────────────────────────────────────────────

  const openAdd = () => {
    setModalMode("add");
    setFarmerForm({ ...EMPTY_FORM });
    setFormError(null);
    setShowFormModal(true);
  };

  const openEdit = (farmer: Farmer) => {
    setModalMode("edit");
    setFarmerForm({
      prn_no: farmer.prn ?? "",
      name: farmer.name ?? "",
      phone: farmer.phone ?? "",
      district: farmer.district ?? "",
      village: farmer.address ?? farmer.village ?? "",
      taluka: farmer.taluka ?? "",
      state: farmer.state ?? "",
      crop: farmer.crop ?? "",
      farmSize: farmer.farmSize ?? "",
    });
    setSelectedFarmer(farmer);
    setFormError(null);
    setShowFormModal(true);
  };

  // ── Field helper ────────────────────────────────────────────────────────────

  const Field = ({
    label,
    name,
    type = "text",
    required = false,
    placeholder = "",
  }: {
    label: string;
    name: keyof typeof farmerForm;
    type?: string;
    required?: boolean;
    placeholder?: string;
  }) => (
    <div>
      <label className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5 block">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={farmerForm[name]}
        onChange={(e) => setFarmerForm((prev) => ({ ...prev, [name]: e.target.value }))}
        className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
      />
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title="Farmers">
      {/* ── Header ── */}
      <div className="flex flex-wrap gap-3 justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface mb-0.5">Farmer Data</h1>
          <p className="text-sm text-on-surface-variant">
            {loading ? "Loading…" : `${filtered.length} of ${farmers.length} farmers`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={fetchFarmers}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-on-surface-variant hover:bg-surface-container"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => exportCSV(filtered)}
            variant="outline"
            className="border-outline-variant/50 text-on-surface-variant hover:bg-surface-container rounded-xl text-sm px-4 h-10 gap-2"
          >
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button
            onClick={() => exportExcel(filtered)}
            variant="outline"
            className="border-outline-variant/50 text-on-surface-variant hover:bg-surface-container rounded-xl text-sm px-4 h-10 gap-2"
          >
            <Download className="w-4 h-4" /> Excel
          </Button>
          <Button
            onClick={openAdd}
            className="bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-sm px-5 h-10 gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Farmer
          </Button>
        </div>
      </div>

      {/* ── Success toast ── */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-error/10 border border-error/20 text-error rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Search name, PRN, phone, village…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/50" />
          <select
            value={districtFilter}
            onChange={(e) => { setDistrictFilter(e.target.value); setPage(1); }}
            className="pl-8 pr-8 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition appearance-none cursor-pointer"
          >
            <option value="">All Districts</option>
            {uniqueDistricts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/50" />
          <select
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
            className="pl-8 pr-8 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition appearance-none cursor-pointer"
          >
            <option value="">All States</option>
            {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {(search || districtFilter || stateFilter) && (
          <button
            onClick={() => { setSearch(""); setDistrictFilter(""); setStateFilter(""); setPage(1); }}
            className="px-3 py-2 text-xs text-on-surface-variant hover:text-error transition flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th onClick={() => handleSort("prn")} className="font-semibold text-xs uppercase tracking-wider py-4 px-5 whitespace-nowrap cursor-pointer select-none hover:text-green-700 transition-colors">PRN<SortIndicator col={"prn" as keyof Farmer} /></th>
                <th onClick={() => handleSort("name")} className="font-semibold text-xs uppercase tracking-wider py-4 px-5 whitespace-nowrap cursor-pointer select-none hover:text-green-700 transition-colors">Farmer Name<SortIndicator col={"name" as keyof Farmer} /></th>
                <th onClick={() => handleSort("address")} className="font-semibold text-xs uppercase tracking-wider py-4 px-5 whitespace-nowrap cursor-pointer select-none hover:text-green-700 transition-colors">Address Details<SortIndicator col={"address" as keyof Farmer} /></th>
                <th onClick={() => handleSort("district")} className="font-semibold text-xs uppercase tracking-wider py-4 px-5 whitespace-nowrap cursor-pointer select-none hover:text-green-700 transition-colors">District<SortIndicator col={"district" as keyof Farmer} /></th>
                <th onClick={() => handleSort("phone")} className="font-semibold text-xs uppercase tracking-wider py-4 px-5 whitespace-nowrap cursor-pointer select-none hover:text-green-700 transition-colors">Mobile Number<SortIndicator col={"phone" as keyof Farmer} /></th>
                <th onClick={() => handleSort("planting_date" as keyof Farmer)} className="font-semibold text-xs uppercase tracking-wider py-4 px-5 whitespace-nowrap cursor-pointer select-none hover:text-green-700 transition-colors">Planting Date<SortIndicator col={"planting_date" as keyof Farmer} /></th>
                <th onClick={() => handleSort("season" as keyof Farmer)} className="font-semibold text-xs uppercase tracking-wider py-4 px-5 whitespace-nowrap cursor-pointer select-none hover:text-green-700 transition-colors">Season<SortIndicator col={"season" as keyof Farmer} /></th>
                <th onClick={() => handleSort("variety" as keyof Farmer)} className="font-semibold text-xs uppercase tracking-wider py-4 px-5 whitespace-nowrap cursor-pointer select-none hover:text-green-700 transition-colors">Variety of Cultivation<SortIndicator col={"variety" as keyof Farmer} /></th>
                <th onClick={() => handleSort("area" as keyof Farmer)} className="font-semibold text-xs uppercase tracking-wider py-4 px-5 whitespace-nowrap cursor-pointer select-none hover:text-green-700 transition-colors">Area (in Hectare)<SortIndicator col={"area" as keyof Farmer} /></th>
                <th className="font-semibold py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="py-4 px-5">
                        <div className="h-4 bg-surface-container rounded animate-pulse" style={{ width: j === 1 ? "120px" : "80px" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-2">
                      <Sprout className="w-8 h-8 opacity-30" />
                      <p className="text-sm">{farmers.length === 0 ? "No farmers registered yet." : "No farmers match your filters."}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((farmer, index) => (
                  <tr
                    key={farmer.id ?? farmer.prn}
                    className="group transition-all duration-200 hover:bg-green-50 "
                  >
                    <td className="py-4 px-5 font-bold text-green-700 whitespace-nowrap">{farmer.prn}</td>
                    <td
                      className="py-4 px-5 font-semibold text-slate-800 whitespace-nowrap cursor-pointer hover:text-green-700 transition-colors"
                      onClick={() => setSelectedFarmer(farmer)}
                    >
                      {farmer.name}
                    </td>
                    <td className="py-3.5 px-5 text-on-surface-variant whitespace-nowrap">{farmer.address ?? farmer.village}</td>
                    <td className="py-3.5 px-5 text-on-surface-variant whitespace-nowrap">{farmer.district}</td>
                    <td className="py-3.5 px-5 text-on-surface-variant whitespace-nowrap">{farmer.phone}</td>
                    <td className="py-3.5 px-5 text-on-surface-variant whitespace-nowrap">{farmer.planting_date ?? '15-07-2025'}</td>
                    <td className="py-3.5 px-5 text-on-surface-variant whitespace-nowrap">{farmer.season ?? 'Kharif 2025'}</td>
                    <td className="py-3.5 px-5 text-on-surface-variant whitespace-nowrap">{farmer.variety ?? 'CO 86032'}</td>
                    <td className="py-3.5 px-5 text-on-surface-variant whitespace-nowrap">{farmer.area ?? '0.84'}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={() => setSelectedFarmer(farmer)}
                          className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                          title="View details"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(farmer)}
                          className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(farmer)}
                          className="p-2 rounded-xl text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {!loading && filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-outline-variant/20 bg-surface-container/30 flex flex-wrap items-center gap-3 justify-between text-sm text-on-surface-variant">

          {/* Left Section */}
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <span>
              {filtered.length === 0
                ? "0"
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}`
              } of {filtered.length}
            </span>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1">

            {/* First */}
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-2 rounded-xl hover:bg-surface-container disabled:opacity-30"
            >
              ⏮
            </button>

            {/* Prev */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl hover:bg-surface-container disabled:opacity-30"
            >
              ◀
            </button>

            {/* Page Numbers */}
            {(() => {
              const visiblePages = 5;

              let start = Math.max(1, page - Math.floor(visiblePages / 2));
              let end = start + visiblePages - 1;

              if (end > totalPages) {
                end = totalPages;
                start = Math.max(1, end - visiblePages + 1);
              }

              return Array.from({ length: end - start + 1 }, (_, i) => {
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs ${p === page
                      ? "bg-primary text-on-primary font-semibold"
                      : "hover:bg-surface-container"
                      }`}
                  >
                    {p}
                  </button>
                );
              });
            })()}

            {/* Next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl hover:bg-surface-container disabled:opacity-30"
            >
              ▶
            </button>

            {/* Last */}
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="p-2 rounded-xl hover:bg-surface-container disabled:opacity-30"
            >
              ⏭
            </button>

          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════ */}
      {/* Add / Edit Modal                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container/40 shrink-0">
              <h2 className="font-headline font-bold text-lg text-on-surface">
                {modalMode === "add" ? "Add New Farmer" : "Edit Farmer"}
              </h2>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-2 -mr-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-error/10 text-error text-sm rounded-xl border border-error/20">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Field label="PRN Number" name="prn_no" required placeholder="e.g. PRN-001234" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Field label="Phone Number" name="phone" type="tel" required placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>

              <Field label="Full Name" name="name" required placeholder="Farmer's full name" />

              <div className="grid grid-cols-2 gap-4">
                <Field label="Village / Address" name="village" required placeholder="Village name" />
                <Field label="Taluka" name="taluka" placeholder="Taluka" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="District" name="district" required placeholder="District" />
                <Field label="State" name="state" placeholder="State" />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFormModal(false)}
                  className="rounded-xl border-outline-variant/40 text-on-surface"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-on-primary rounded-xl hover:bg-primary/90 min-w-[120px]"
                >
                  {submitting
                    ? (modalMode === "add" ? "Adding…" : "Saving…")
                    : (modalMode === "add" ? "Add Farmer" : "Save Changes")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Delete Confirm Modal                                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/30 bg-error/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-error/15 rounded-xl text-error">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 className="font-headline font-bold text-lg text-on-surface">Delete Farmer</h2>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-on-surface-variant mb-1">
                Are you sure you want to delete:
              </p>
              <p className="font-semibold text-on-surface mb-1">{showDeleteConfirm.name}</p>
              <p className="text-xs text-on-surface-variant mb-5">PRN: {showDeleteConfirm.prn}</p>
              <p className="text-sm text-error/80">This action cannot be undone.</p>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-xl border-outline-variant/40"
              >
                Cancel
              </Button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500 text-white px-4 py-2 rounded-xl min-w-[100px] hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Farmer Details Drawer / Modal                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedFarmer && !showFormModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-end p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm h-full max-h-[90vh] flex flex-col animate-in slide-in-from-right-4">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container/40 flex justify-between items-center shrink-0">
              <h2 className="font-headline font-bold text-lg text-on-surface">Farmer Details</h2>
              <button
                onClick={() => setSelectedFarmer(null)}
                className="p-2 -mr-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar + name banner */}
            <div className="px-6 py-5 bg-gradient-to-b from-primary/8 to-transparent border-b border-outline-variant/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center text-primary font-headline font-bold text-xl">
                  {selectedFarmer.name?.[0]?.toUpperCase() ?? "F"}
                </div>
                <div>
                  <p className="font-headline font-bold text-on-surface text-base">{selectedFarmer.name}</p>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">{selectedFarmer.prn}</p>
                  {selectedFarmer.crop && (
                    <div className="mt-1.5">
                      <Badge color="emerald">{selectedFarmer.crop}</Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <DetailRow icon={Phone} label="Phone" value={selectedFarmer.phone} />
              <DetailRow
                icon={MapPin}
                label="Address"
                value={[
                  selectedFarmer.address ?? selectedFarmer.village,
                  selectedFarmer.taluka,
                  selectedFarmer.district,
                  selectedFarmer.state,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
              <DetailRow icon={Hash} label="PRN Number" value={selectedFarmer.prn} />
              <DetailRow icon={Maximize2} label="Farm Size" value={selectedFarmer.farmSize} />
              <DetailRow icon={CalendarDays} label="Last Visit" value={selectedFarmer.lastVisit} />
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-outline-variant/20 flex gap-3 shrink-0">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-outline-variant/40 text-error hover:bg-error/10 hover:border-error/30 gap-2"
                onClick={() => {
                  setShowDeleteConfirm(selectedFarmer);
                  setSelectedFarmer(null);
                }}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
              <Button
                className="flex-1 bg-primary text-on-primary hover:bg-primary/90 rounded-xl gap-2"
                onClick={() => openEdit(selectedFarmer)}
              >
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}