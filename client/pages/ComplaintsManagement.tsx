import React, { FormEvent, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { Search, X, User, Tag, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "../lib/AuthProvider";
import { RedAlertSection } from "@/components/RedAlertSection";
import { ComplaintStatsCards } from "@/components/ComplaintStatsCards";
import { cn } from "@/lib/utils";
import { uploadImageToS3 } from "@/lib/s3Upload";
import { COMPLAINT_CATEGORIES } from "@/lib/complaintUtils";
import {
  normalizeComplaintStatus,
  getRedAlertComplaints,
  calculateComplaintStats,
  isRedAlert,
  getDaysPending,
  getStatusDisplay,
  type Complaint,
} from "@/lib/complaintUtils";

const COMPLAINT_TYPES = COMPLAINT_CATEGORIES.map((value) => ({ label: value, value }));

type ComplaintType = (typeof COMPLAINT_CATEGORIES)[number];

const inputCls = (hasError?: boolean) =>
  cn(
    "h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 disabled:opacity-60 transition-colors",
    hasError && "border-destructive/50 focus:ring-destructive/12",
  );

const textareaCls = () =>
  "min-h-[96px] py-2.5 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 disabled:opacity-60 transition-colors";

function AddComplaintModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuth();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [form, setForm] = useState({
    prn_no: "",
    farmer_name: "",
    complaint_date: today,
    mobile: "",
    district: "",
    taluka: "",
    village: "",
    complaint_type: COMPLAINT_CATEGORIES[0] as ComplaintType,
    complaint: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lookupStatus, setLookupStatus] = useState<{ kind: "idle" | "loading" | "success" | "error"; message?: string }>({ kind: "idle" });
  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "success" | "error"; message?: string }>({ kind: "idle" });

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => { if (!(key in prev)) return prev; const next = { ...prev }; delete next[key]; return next; });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    const prn = form.prn_no.trim();
    const mobile = form.mobile.trim();
    if (!prn) next.prn_no = "PRN is required.";
    if (!form.complaint_date) next.complaint_date = "Date is required.";
    if (!form.farmer_name.trim()) next.farmer_name = "Farmer name is required.";
    if (!mobile) next.mobile = "Mobile number is required.";
    else if (!/^[0-9]{10}$/.test(mobile)) next.mobile = "Mobile number must be 10 digits.";
    if (!form.district.trim()) next.district = "District is required.";
    if (!form.village.trim()) next.village = "Village is required.";
    return next;
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const prn = form.prn_no.trim();
    const mobile = form.mobile.trim();
    if (prn.length < 2 && mobile.length < 10) { setAutoFilled(false); setLookupStatus({ kind: "idle" }); return; }
    const t = setTimeout(async () => {
      if (!token) return;
      setLookupStatus({ kind: "loading", message: prn ? "Searching PRN…" : "Searching mobile…" });
      try {
        const url = prn
          ? `/api/farmers/${encodeURIComponent(prn)}`
          : `/api/farmers/mobile/${encodeURIComponent(mobile)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (cancelled) return;
        if (!res.ok) {
          setAutoFilled(false);
          setForm((s) => ({ ...s, farmer_name: "", mobile: "", district: "", taluka: "", village: "", prn_no: prn ? s.prn_no : "" }));
          setLookupStatus({ kind: "error", message: res.status === 404 ? (prn ? "PRN not found." : "Mobile not found.") : "Lookup failed." });
          return;
        }
        const body = await res.json();
        const farmer = body?.farmer;
        setForm((s) => ({
          ...s,
          farmer_name: String(farmer?.name ?? ""),
          mobile: String(farmer?.phone ?? ""),
          district: String(farmer?.district ?? ""),
          taluka: String(farmer?.taluka ?? ""),
          village: String(farmer?.village ?? ""),
          prn_no: prn ? s.prn_no : String(farmer?.prn_no ?? s.prn_no),
        }));
        setAutoFilled(true);
        setLookupStatus({ kind: "success", message: "Auto-filled farmer details." });
      } catch (e: any) {
        if (cancelled) return;
        setAutoFilled(false);
        setLookupStatus({ kind: "error", message: e?.message ?? "Unable to fetch farmer." });
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.prn_no, form.mobile, token, open]);

  const resetForm = () => {
    setForm({ prn_no: "", farmer_name: "", complaint_date: today, mobile: "", district: "", taluka: "", village: "", complaint_type: COMPLAINT_CATEGORIES[0], complaint: "" });
    setImageFile(null);
    setAutoFilled(false);
    setSubmitAttempted(false);
    setFieldErrors({});
    setLookupStatus({ kind: "idle" });
    setStatus({ kind: "idle" });
  };

  const handleClose = () => { resetForm(); onClose(); };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setStatus({ kind: "idle" });
    const nextErrors = validate();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!token) { setStatus({ kind: "error", message: "Session expired. Please login again." }); return; }
    try {
      setStatus({ kind: "loading", message: "Uploading image..." });
      let imageUrl = "";
      if (imageFile) imageUrl = await uploadImageToS3({ file: imageFile, token, purpose: "complaint" });
      setStatus({ kind: "loading", message: "Submitting complaint..." });
      const payload = { prn_no: form.prn_no.trim(), farmer_name: form.farmer_name, complaint_date: form.complaint_date, mobile: form.mobile, district: form.district, taluka: form.taluka, village: form.village, complaint_type: form.complaint_type, complaint: form.complaint, image: imageUrl };
      const res = await fetch("/api/complaints", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus({ kind: "error", message: body?.message ?? "Complaint submission failed." }); return; }
      const successMessage = body?.warning
        ? `${body?.message ?? "Complaint registered successfully."} ${body.warning}`
        : body?.message ?? "Complaint registered successfully.";
      setStatus({ kind: "success", message: successMessage });
      setTimeout(() => { handleClose(); onSuccess(); }, 1200);
    } catch (e: any) {
      setStatus({ kind: "error", message: e?.message ?? "Unable to submit complaint." });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-6 flex flex-col rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Add Complaint</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enter PRN to autofill farmer details, then submit.</p>
          </div>
          <button onClick={handleClose} className="p-2 -mr-2 rounded-full text-muted-foreground hover:bg-muted/50 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={onSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Farmer Details */}
          <div className="rounded-2xl border border-border/50 bg-muted/10 p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10"><User className="h-4 w-4 text-primary" /></div>
              <h3 className="font-semibold text-foreground">Farmer Details</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">PRN Number</label>
                <input className={inputCls(submitAttempted && !!fieldErrors.prn_no)} value={form.prn_no} onChange={(e) => { setAutoFilled(false); clearFieldError("prn_no"); setForm((s) => ({ ...s, prn_no: e.target.value })); }} placeholder="e.g. PRN-001234" />
                {lookupStatus.kind === "loading" ? <p className="mt-1 text-xs text-muted-foreground">{lookupStatus.message}</p>
                  : lookupStatus.kind === "success" ? <p className="mt-1 text-xs font-medium text-emerald-600">{lookupStatus.message}</p>
                  : lookupStatus.kind === "error" ? <p className="mt-1 text-xs font-medium text-destructive">{lookupStatus.message}</p>
                  : submitAttempted && fieldErrors.prn_no ? <p className="mt-1 text-xs font-medium text-destructive">{fieldErrors.prn_no}</p>
                  : <p className="mt-1 text-xs text-muted-foreground">Start typing PRN to auto-fill details.</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Date of Complaint</label>
                <input type="date" className={inputCls(submitAttempted && !!fieldErrors.complaint_date)} value={form.complaint_date} onChange={(e) => setForm((s) => ({ ...s, complaint_date: e.target.value }))} />
                {submitAttempted && fieldErrors.complaint_date && <p className="mt-1 text-xs font-medium text-destructive">{fieldErrors.complaint_date}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Farmer Name</label>
                <input className={inputCls(submitAttempted && !!fieldErrors.farmer_name)} value={form.farmer_name} onChange={(e) => setForm((s) => ({ ...s, farmer_name: e.target.value }))} readOnly={autoFilled} placeholder="Auto-filled from PRN" />
                {submitAttempted && fieldErrors.farmer_name && <p className="mt-1 text-xs font-medium text-destructive">{fieldErrors.farmer_name}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Mobile Number</label>
                <input className={inputCls(submitAttempted && !!fieldErrors.mobile)} value={form.mobile} onChange={(e) => { setAutoFilled(false); clearFieldError("mobile"); setForm((s) => ({ ...s, mobile: e.target.value })); }} placeholder="10 digit mobile" inputMode="numeric" maxLength={10} readOnly={autoFilled} />
                {submitAttempted && fieldErrors.mobile ? <p className="mt-1 text-xs font-medium text-destructive">{fieldErrors.mobile}</p> : <p className="mt-1 text-xs text-muted-foreground">Numbers only (10 digits).</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">District</label>
                <input className={inputCls(submitAttempted && !!fieldErrors.district)} value={form.district} onChange={(e) => setForm((s) => ({ ...s, district: e.target.value }))} readOnly={autoFilled} placeholder="Auto-filled from PRN" />
                {submitAttempted && fieldErrors.district && <p className="mt-1 text-xs font-medium text-destructive">{fieldErrors.district}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Taluka</label>
                <input className={inputCls()} value={form.taluka} onChange={(e) => setForm((s) => ({ ...s, taluka: e.target.value }))} placeholder="Enter taluka" readOnly={autoFilled} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Village</label>
                <input className={inputCls(submitAttempted && !!fieldErrors.village)} value={form.village} onChange={(e) => setForm((s) => ({ ...s, village: e.target.value }))} readOnly={autoFilled} placeholder="Auto-filled from PRN" />
                {submitAttempted && fieldErrors.village && <p className="mt-1 text-xs font-medium text-destructive">{fieldErrors.village}</p>}
              </div>
            </div>
          </div>

          {/* Complaint Type */}
          <div className="rounded-2xl border border-border/50 bg-muted/10 p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10"><Tag className="h-4 w-4 text-primary" /></div>
              <h3 className="font-semibold text-foreground">Complaint Type</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COMPLAINT_TYPES.map((t) => (
                <label key={t.value} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/4 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/6">
                  <input type="radio" name="modal_complaint_type" value={t.value} checked={form.complaint_type === t.value} onChange={() => setForm((s) => ({ ...s, complaint_type: t.value }))} className="h-4 w-4 accent-primary" />
                  <span className="text-sm text-foreground">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Complaint Details */}
          <div className="rounded-2xl border border-border/50 bg-muted/10 p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10"><FileText className="h-4 w-4 text-primary" /></div>
              <h3 className="font-semibold text-foreground">Complaint Details</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Complaint Description</label>
                <textarea className={textareaCls()} value={form.complaint} onChange={(e) => setForm((s) => ({ ...s, complaint: e.target.value }))} placeholder="Describe the issue..." />
                <p className="mt-1 text-xs text-muted-foreground">Keep it short and specific.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Upload Image (optional)</label>
                <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/20 p-5 text-center hover:border-primary/40 hover:bg-primary/4 transition-all">
                  <input id="modal-image" type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                  <label htmlFor="modal-image" className="cursor-pointer">
                    <p className="text-sm text-muted-foreground">{imageFile ? imageFile.name : "Click to upload an image"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">JPG/PNG, max 5MB</p>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {status.kind !== "idle" && (
            <div className={cn(
              status.kind === "success" && "rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800",
              status.kind === "error" && "rounded-xl border border-destructive/20 bg-destructive/6 p-3.5 text-sm font-medium text-destructive",
              status.kind === "loading" && "rounded-xl border border-border/50 bg-muted/40 p-3.5 text-sm text-muted-foreground",
            )}>{status.message}</div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1 h-11 rounded-xl">Cancel</Button>
            <Button type="submit" disabled={status.kind === "loading"} className="flex-1 h-11 rounded-xl font-semibold shadow-sm shadow-primary/20">
              {status.kind === "loading" ? "Submitting..." : "Submit Complaint"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ComplaintsManagement() {
  const { token } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "solved" | "red-alert">("all");
  const [filterDomain, setFilterDomain] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam && ["pending", "solved", "red-alert"].includes(statusParam)) {
      setFilterStatus(statusParam as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (token) {
      fetchComplaints();
    }
  }, [token]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/complaints", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setComplaints(data.complaints || []);
    } catch (error) {
      console.error("Fetch complaints error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => calculateComplaintStats(complaints), [complaints]);

  // Get red alert complaints
  const redAlertComplaints = useMemo(() => getRedAlertComplaints(complaints), [complaints]);

  // Extract domain options
  const domainOptions = useMemo(
    () =>
      Array.from(
        new Set(
          complaints
            .map((comp) => (comp.domain || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [complaints]
  );

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((comp) => {
      // Search filter
      const searchValue = searchTerm.toLowerCase();
      const matchesSearch =
        (comp.id || "").toString().toLowerCase().includes(searchValue) ||
        (comp.complaint_id || "").toString().toLowerCase().includes(searchValue) ||
        (comp.farmer_name || "").toString().toLowerCase().includes(searchValue) ||
        (comp.prn_no || "").toString().toLowerCase().includes(searchValue);

      if (!matchesSearch) return false;

      // Domain filter
      const matchesDomain =
        filterDomain === "all" ||
        (comp.domain || "").toLowerCase() === filterDomain.toLowerCase();

      if (!matchesDomain) return false;

      // Status filter
      if (filterStatus === "all") return true;
      if (filterStatus === "red-alert") return isRedAlert(comp);
      if (filterStatus === "pending") return normalizeComplaintStatus(comp.solve_status) === "Pending";
      if (filterStatus === "solved") return normalizeComplaintStatus(comp.solve_status) === "Solved";

      return true;
    });
  }, [complaints, searchTerm, filterDomain, filterStatus]);

  const handleStatsClick = (filter: "all" | "pending" | "solved" | "red-alert") => {
    setFilterStatus(filter);
  };

  return (
    <AdminLayout title="Complaints Management">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold font-headline text-on-surface">
              Complaints Management
            </h1>
            <p className="text-sm text-on-surface-variant">
              View and track all farmer complaints with SLA monitoring
            </p>
          </div>
          {/* Add Complaint button */}
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-sm px-5 h-10"
          >
            Add Complaint
          </Button>
        </div>

        {/* Statistics Cards */}
        <ComplaintStatsCards stats={stats} onFilterClick={handleStatsClick} isLoading={loading} />

        {/* Red Alert Section */}
        {redAlertComplaints.length > 0 && (
          <RedAlertSection
            complaints={redAlertComplaints}
            onSelectComplaint={(complaint) => setSelectedComplaint(complaint)}
          />
        )}

        {/* Filters */}
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
              <Input
                type="text"
                placeholder="Search by ID, Name or PRN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 w-full bg-surface-container-low border-outline-variant/30 rounded-xl focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Domain Filter */}
            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="h-10 px-4 bg-surface-container-low border border-outline-variant/30 text-on-surface rounded-xl cursor-pointer focus:ring-primary focus:border-primary focus:outline-none"
            >
              <option value="all">All Domains</option>
              {domainOptions.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="h-10 px-4 bg-surface-container-low border border-outline-variant/30 text-on-surface rounded-xl cursor-pointer focus:ring-primary focus:border-primary focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="solved">Solved</option>
              <option value="red-alert">🔴 Red Alert</option>
            </select>
          </div>
        </div>
        {/* Complaints Table */}
        <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container/50 text-on-surface-variant">
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Complaint ID</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">PRN</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Name</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Registered By</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Domain</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Days</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Assigned To</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                      Loading complaints...
                    </td>
                  </tr>
                ) : filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                      No complaints found.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => {
                    const statusDisplay = getStatusDisplay(c.solve_status);
                    const daysPending = getDaysPending(c);
                    const isAlert = isRedAlert(c);

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedComplaint(c)}
                        className={`transition-colors cursor-pointer ${
                          isAlert
                            ? "bg-red-50/30 hover:bg-red-50/50"
                            : "hover:bg-surface-container-low/50"
                        }`}
                      >
                        <td className="px-6 py-4 font-bold text-primary hover:underline truncate max-w-[100px]">
                          {c.complaint_id || c.id}
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">{c.prn_no}</td>
                        <td className="px-6 py-4 font-medium text-on-surface truncate max-w-[150px]">
                          {c.farmer_name}
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">
                          {c.registered_by_name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">{c.domain}</td>
                        <td
                          className={`px-6 py-4 font-semibold ${
                            isAlert ? "text-red-600" : "text-on-surface-variant"
                          }`}
                        >
                          {daysPending} {isAlert && "🔴"}
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">
                          {(c.assignedEmployeeNames || []).join(", ") || "Unassigned"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${statusDisplay.bgColor} ${statusDisplay.color} border-current/20`}
                          >
                            {statusDisplay.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Complaint Modal */}
        <AddComplaintModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchComplaints}
        />

        {/* Progress Report Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container/30 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-bold font-headline text-on-surface">
                  Progress Report
                  <span className="truncate max-w-[100px] rounded-md bg-primary/10 px-2 py-0.5 text-sm text-primary">
                    {selectedComplaint.id}
                  </span>
                </h2>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-2 -mr-2 rounded-full text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Info Box */}
                <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      Farmer
                    </p>
                    <p className="text-sm font-medium text-on-surface">{selectedComplaint.farmer_name}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      Domain
                    </p>
                    <p className="text-sm font-medium text-on-surface">{selectedComplaint.domain}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      Days Pending
                    </p>
                    <p className="text-sm font-medium text-on-surface">{getDaysPending(selectedComplaint)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      Status
                    </p>
                    <p className="text-sm font-medium text-on-surface">
                      {normalizeComplaintStatus(selectedComplaint.solve_status)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      Solved By
                    </p>
                    <p className="text-sm font-medium text-on-surface">
                      {selectedComplaint.solved_by_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      Remark
                    </p>
                    <p className="text-sm font-medium text-on-surface whitespace-pre-wrap">
                      {selectedComplaint.solved_remark || "-"}
                    </p>
                  </div>
                </div>

                {/* Timeline */}
                <h3 className="mb-4 font-semibold text-on-surface">Timeline</h3>
                <div className="relative ml-3 space-y-6 border-l-2 border-outline-variant/30">
                  {(selectedComplaint.progress || []).map((item: any, idx: number) => (
                    <div key={idx} className="relative pl-6">
                      <span className="absolute -left-[11px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-surface-container-lowest">
                        <span className="h-2 w-2 rounded-full bg-primary"></span>
                      </span>
                      <p className="mb-1 text-xs font-semibold text-primary">
                        {new Date(item.date).toLocaleString()}
                      </p>
                      <p className="mt-1 rounded-xl border border-outline-variant/20 bg-surface-container-low p-3 text-sm font-medium text-on-surface shadow-sm">
                        {item.note}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Image */}
                <div className="mt-6">
                  <h3 className="mb-3 font-semibold text-on-surface">Attached Image</h3>
                  {selectedComplaint.image ? (
                    <img
                      src={selectedComplaint.image}
                      alt="Complaint attachment"
                      className="max-h-64 w-full rounded-xl border border-outline-variant/30 bg-surface object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-sm text-on-surface-variant">
                      No image available.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-outline-variant/30 flex justify-end p-4">
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
