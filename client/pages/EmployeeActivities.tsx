import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import AdminLayout from "../components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus, X, Search, RefreshCw, CheckCircle2, AlertTriangle,
  MapPin, Phone, Mail, Calendar, ClipboardList, FlaskConical,
  Megaphone, Eye, ChevronDown, Loader2, Hash, Building2,
  Briefcase, User2, BadgeCheck,
} from "lucide-react";
import { useAuth } from "../lib/AuthProvider";
import { EMPLOYEE_PROFILE_ROLES, COMPLAINT_CATEGORIES } from "../../shared/appConstants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  email: string;
  contact: string;
  dob: string;
  gender: string;
  domain: string;
  address: string;
  profile_photo?: string | null;
  profile_photo_updated_at?: string | null;
  role?: (typeof EMPLOYEE_PROFILE_ROLES)[number];
  created_at?: string;
  activeComplaints?: number;
  workVisit?: number;
  randomSampling?: number;
  outreach?: number;
}

interface EmployeeStatsRow {
  id: string;
  email: string;
  workVisit?: number;
  randomSampling?: number;
  outreach?: number;
  activeComplaints?: number;
  complaintsAssigned?: Array<{ status?: string }>;
}

interface EmpActivity {
  id: number;
  activity_type: "field_visit" | "expert_session" | "seminar";
  date: string;
  location: string;
  description: string;
}

interface Complaint {
  id: string;
  complaint_id?: string;
  title: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  assigned_at: string;
  progress?: { date: string; note: string }[];
}

interface Sampling {
  id: number;
  sample_date: string;
  sample_type: string;
  location: string;
  result: string;
}

interface Outreach {
  id: number;
  outreach_date: string;
  outreach_type: string;
  target_group: string;
  beneficiaries: number;
}

interface EmployeeDetail {
  employee: Employee;
  activities: EmpActivity[];
  complaints: Complaint[];
  samplings: Sampling[];
  outreach: Outreach[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, string> = {
  field_visit:    "Field Visit",
  expert_session: "Expert Session",
  seminar:        "Seminar",
};

const ACTIVITY_BADGE: Record<string, string> = {
  field_visit:    "bg-primary/10 text-primary",
  expert_session: "bg-secondary/40 text-secondary-foreground",
  seminar:        "bg-accent/40 text-accent-foreground",
};

const COMPLAINT_STATUS: Record<string, { label: string; cls: string }> = {
  open:        { label: "Open",        cls: "bg-destructive/10 text-destructive" },
  in_progress: { label: "In Progress", cls: "bg-secondary/40 text-secondary-foreground" },
  resolved:    { label: "Resolved",    cls: "bg-primary/10 text-primary" },
  closed:      { label: "Closed",      cls: "bg-muted/50 text-muted-foreground" },
};

const GENDERS     = ["Male", "Female"];
const DEPARTMENTS = [
  "Agriculture Extension", "Field Operations", "Water Management",
  "Rural Development", "Health & Sanitation", "Administration", "IT & Systems",
];
const DESIGNATIONS = [
  "Field Officer", "Senior Field Officer", "Block Coordinator",
  "District Coordinator", "Technical Expert", "Supervisor", "Manager",
];

const AVATAR_PALETTE = [
  "bg-primary/10 text-primary",
  "bg-secondary/40 text-secondary-foreground",
  "bg-accent/40 text-accent-foreground",
  "bg-muted/50 text-muted-foreground",
  "bg-surface-container-low text-on-surface",
  "bg-surface-container-high text-on-surface",
];

// ─── Small helpers ────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 1)
    .join("")
    .toUpperCase();
}

function avatarCls(id: string | number) {
  const numVal = typeof id === 'string' 
    ? id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : id;
  return AVATAR_PALETTE[numVal % AVATAR_PALETTE.length];
}

function profilePhotoSrc(photoUrl?: string | null, photoUpdatedAt?: string | null) {
  if (!photoUrl) return undefined;
  const version = photoUpdatedAt ? new Date(photoUpdatedAt).getTime() : 0;
  if (!version || Number.isNaN(version)) return photoUrl;
  const separator = photoUrl.includes("?") ? "&" : "?";
  return `${photoUrl}${separator}v=${version}`;
}

function Pill({ children, cls }: { children: React.ReactNode; cls?: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-xl text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5 block">
      {children} {required && <span className="text-destructive">*</span>}
    </label>
  );
}

const inputCls =
  "w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-all duration-200 hover:border-outline-variant/50";

const selectCls =
  "w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-all duration-200 appearance-none cursor-pointer hover:border-outline-variant/50";

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
    </div>
  );
}

// ─── Add Employee Modal ───────────────────────────────────────────────────────

interface AddEmployeeModalProps {
  token: string | null;
  onClose: () => void;
  onSuccess: (emp: Employee) => void;
}

const EMPTY_FORM = {
  name: "", email: "", password: "", confirm_password: "",
  contact: "", dob: "", gender: "", address: "", domain: "",
};

function AddEmployeeModal({ token, onClose, onSuccess }: AddEmployeeModalProps) {
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showPass, setShowPass]     = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm_password)
      return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      const { confirm_password, ...payload } = form;
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add employee.");
      onSuccess(data.employee);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // max dob = 18 years ago
  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 18);
  const maxDobStr = maxDob.toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container/40 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-headline font-bold text-lg text-on-surface leading-tight">Add Employee</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">ID will be auto-assigned on creation</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-6">

            {error && (
              <div className="flex items-start gap-3 p-4 bg-error/15 text-error text-sm rounded-xl border border-error/25 backdrop-blur-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 flex-shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Section: Personal */}
            <div className="space-y-4 pb-2">
              <div className="flex items-center gap-2 pb-2 border-b border-primary/20">
                <div className="p-2 bg-primary/10 rounded-lg rounded-b-none">
                  <User2 className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-on-surface">Personal Details</p>
              </div>
              <div className="space-y-4 pt-2">

                <div>
                  <FieldLabel required>Full Name</FieldLabel>
                  <input type="text" required placeholder="e.g. Aarav Sharma" value={form.name} onChange={set("name")} className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel required>Date of Birth</FieldLabel>
                    <input type="date"  value={form.dob} onChange={set("dob")} max={maxDobStr} className={inputCls} />
                  </div>
                  <div>
                    <FieldLabel>Gender</FieldLabel>
                    <SelectWrapper>
                      <select value={form.gender} onChange={set("gender")} className={selectCls}>
                        <option value="">Select gender</option>
                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </SelectWrapper>
                  </div>
                </div>

                <div>
                  <FieldLabel>Address</FieldLabel>
                  <textarea
                    placeholder="Village / Block / District"
                    value={form.address}
                    onChange={set("address")}
                    rows={2}
                    className={inputCls + " resize-none"}
                  />
                </div>
              </div>
            </div>

            {/* Section: Contact */}
            <div className="space-y-4 pb-2">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-200/40">
                <div className="p-2 bg-blue-50 rounded-lg rounded-b-none">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-on-surface">Contact & Access</p>
              </div>
              <div className="space-y-4 pt-2">

                <div>
                  <FieldLabel required>Email Address</FieldLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
                    <input type="email" required placeholder="employee@org.in" value={form.email} onChange={set("email")} className={inputCls + " pl-9"} />
                  </div>
                </div>

                <div>
                  <FieldLabel required>Contact Number</FieldLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
                    <input type="tel"  placeholder="+91 98XXX XXXXX" value={form.contact} onChange={set("contact")} className={inputCls + " pl-9"} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel required>Password</FieldLabel>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        required
                        minLength={8}
                        placeholder="Min. 8 characters"
                        value={form.password}
                        onChange={set("password")}
                        className={inputCls + " pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant/60 hover:text-on-surface"
                      >
                        {showPass ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <FieldLabel required>Confirm Password</FieldLabel>
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="Re-enter password"
                      value={form.confirm_password}
                      onChange={set("confirm_password")}
                      className={inputCls + (form.confirm_password && form.confirm_password !== form.password ? " border-error/60 ring-1 ring-error/30" : "")}
                    />
                  </div>
                </div>
                {form.confirm_password && form.confirm_password !== form.password && (
                  <p className="text-xs text-error -mt-1">Passwords do not match</p>
                )}
              </div>
            </div>

            {/* Section: Role & Department */}
            <div className="space-y-4 pb-2">
              <div className="flex items-center gap-2 pb-2 border-b border-purple-200/40">
                <div className="p-2 bg-purple-50 rounded-lg rounded-b-none">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-sm font-semibold text-on-surface">Role & Department</p>
              </div>
              <div className="space-y-4 pt-2">
                <div>
                  <FieldLabel>Domain</FieldLabel>
                  <SelectWrapper>
                    <select
                      value={form.domain}
                      onChange={set("domain")}
                      className={selectCls}
                    >
                      <option value="">Select domain</option>
                      {COMPLAINT_CATEGORIES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </SelectWrapper>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-outline-variant/20 bg-gradient-to-r from-surface-container/40 to-surface-container/20 flex justify-end gap-3 shrink-0 sticky bottom-0">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-outline-variant/40 text-on-surface hover:bg-surface-container/40 transition-colors">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || (!!form.confirm_password && form.confirm_password !== form.password)}
              className="bg-primary text-on-primary rounded-xl hover:bg-primary/90 active:scale-95 min-w-[160px] gap-2 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : <><Plus className="w-4 h-4" /> Add Employee</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Employee Detail Popup ────────────────────────────────────────────────────

type DetailTab = "visits" | "solvedComplaints" | "liveComplaints" | "sampling" | "outreach";

function EmployeeDetailPopup({ emp, token, onClose }: { emp: Employee; token: string | null; onClose: () => void }) {
  const [data, setData]             = useState<EmployeeDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [fetchErr, setFetchErr]     = useState<string | null>(null);
  const [tab, setTab]               = useState<DetailTab>("visits");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const overlayRef                  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setFetchErr(null);
      try {
        const res = await fetch(`/api/employees/${emp.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to load employee details.");
        setData(json);
      } catch (err: any) {
        setFetchErr(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [emp.id, token]);

  const solvedCount = data?.complaints.filter((c) => c.status === "resolved" || c.status === "closed").length ?? 0;
  const liveCount = data?.complaints.filter((c) => c.status === "open" || c.status === "in_progress").length ?? 0;

  const TABS: { key: DetailTab; icon: React.ReactNode; label: string; count?: number }[] = [
    { key: "visits", icon: <MapPin className="w-3.5 h-3.5" />, label: "Work Visits", count: data?.activities.length },
    { key: "solvedComplaints", icon: <ClipboardList className="w-3.5 h-3.5" />, label: "Solved Complaints", count: solvedCount },
    { key: "liveComplaints", icon: <ClipboardList className="w-3.5 h-3.5" />, label: "Live Complaints", count: liveCount },
    { key: "sampling", icon: <FlaskConical className="w-3.5 h-3.5" />, label: "Sampling", count: data?.samplings.length },
    { key: "outreach", icon: <Megaphone className="w-3.5 h-3.5" />, label: "Outreach", count: data?.outreach.length },
  ];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Profile header */}
        <div className="px-6 pt-5 pb-4 border-b border-outline-variant/30 bg-surface-container/30 shrink-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 rounded-2xl shrink-0">
                <AvatarImage src={profilePhotoSrc(emp.profile_photo, emp.profile_photo_updated_at)} alt={emp.name} />
                <AvatarFallback className={`text-lg font-bold ${avatarCls(emp.id)}`}>
                  {initials(emp.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-on-surface leading-tight">{emp.name}</h2>
                  <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-semibold">
                    {emp.id}
                  </span>
                </div>
                {(emp.domain) && (
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Domain: {emp.domain}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{emp.email}</span>
                  <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{emp.contact}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />DOB: {emp.dob}</span>
                  {emp.gender && <span className="flex items-center gap-1.5"><User2 className="w-3 h-3" />{emp.gender}</span>}
                </div>
                {emp.address && (
                  <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 shrink-0" />{emp.address}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 -mt-1 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            {TABS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-xl px-3 py-2 text-center transition-colors ${tab === key ? "bg-primary/10 ring-1 ring-primary/30" : "bg-surface-container hover:bg-surface-container-low"}`}
              >
                <p className={`text-lg font-bold leading-none ${tab === key ? "text-primary" : "text-on-surface"}`}>
                  {loading ? "—" : count ?? 0}
                </p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">{label}</p>
              </button>
            ))}
          </div>
        </div>

       

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-on-surface-variant text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : fetchErr ? (
            <div className="flex items-center gap-2 p-3 bg-error/10 text-error text-sm rounded-xl border border-error/20">
              <AlertTriangle className="w-4 h-4 shrink-0" />{fetchErr}
            </div>
          ) : (
            <div className="space-y-2">

              {tab === "visits" && (
                data!.activities.length === 0
                  ? <EmptyState msg="No work visits recorded yet." />
                  : data!.activities.map((act) => (
                    <div key={act.id} className="flex gap-3 p-3.5 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 hover:bg-surface-container-low transition-colors">
                      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold ${ACTIVITY_BADGE[act.activity_type] || "bg-gray-100 text-gray-700"}`}>
                        {act.activity_type === "field_visit" ? "FV" : act.activity_type === "expert_session" ? "ES" : "SM"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-on-surface">{ACTIVITY_LABELS[act.activity_type]}</span>
                          <span className="text-xs text-on-surface-variant shrink-0">{act.date}</span>
                        </div>
                        {act.location && (
                          <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />{act.location}
                          </p>
                        )}
                        {act.description && <p className="text-xs text-on-surface mt-1">{act.description}</p>}
                      </div>
                    </div>
                  ))
              )}

              {tab === "solvedComplaints" && (
                (data!.complaints.filter((c) => c.status === "resolved" || c.status === "closed")).length === 0
                  ? <EmptyState msg="No solved complaints." />
                  : data!.complaints
                      .filter((c) => c.status === "resolved" || c.status === "closed")
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedComplaint(c)}
                          className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 hover:bg-surface-container-low transition-colors"
                        >
                          <ClipboardList className="w-4 h-4 text-on-surface-variant shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">{c.title}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">ID: {c.complaint_id ?? c.id}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">Status: {c.status}</p>
                          </div>
                          <Pill cls={COMPLAINT_STATUS[c.status]?.cls}>{COMPLAINT_STATUS[c.status]?.label}</Pill>
                        </button>
                      ))
              )}

              {tab === "liveComplaints" && (
                (data!.complaints.filter((c) => c.status === "open" || c.status === "in_progress")).length === 0
                  ? <EmptyState msg="No live complaints." />
                  : data!.complaints
                      .filter((c) => c.status === "open" || c.status === "in_progress")
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedComplaint(c)}
                          className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 hover:bg-surface-container-low transition-colors"
                        >
                          <ClipboardList className="w-4 h-4 text-on-surface-variant shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">{c.title}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">ID: {c.complaint_id ?? c.id}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">Status: {c.status}</p>
                          </div>
                          <Pill cls={COMPLAINT_STATUS[c.status]?.cls}>{COMPLAINT_STATUS[c.status]?.label}</Pill>
                        </button>
                      ))
              )}

              {tab === "sampling" && (
                data!.samplings.length === 0
                  ? <EmptyState msg="No sampling records found." />
                  : data!.samplings.map((s) => (
                    <div key={s.id} className="flex gap-3 p-3.5 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 hover:bg-surface-container-low transition-colors">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">
                        {s.sample_type?.[0] ?? "S"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-on-surface">{s.sample_type} Sample</span>
                          <span className="text-xs text-on-surface-variant">{s.sample_date}</span>
                        </div>
                        {s.location && (
                          <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />{s.location}
                          </p>
                        )}
                        {s.result && <p className="text-xs text-on-surface mt-1">Result: <span className="font-medium">{s.result}</span></p>}
                      </div>
                    </div>
                  ))
              )}

              {tab === "outreach" && (
                data!.outreach.length === 0
                  ? <EmptyState msg="No outreach records found." />
                  : data!.outreach.map((o) => (
                    <div key={o.id} className="flex gap-3 p-3.5 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 hover:bg-surface-container-low transition-colors">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Megaphone className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-on-surface">{o.outreach_type}</span>
                          <span className="text-xs text-on-surface-variant">{o.outreach_date}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">Target: {o.target_group}</p>
                        <p className="text-xs text-on-surface mt-1">
                          Beneficiaries: <span className="font-semibold text-primary">{o.beneficiaries}</span>
                        </p>
                      </div>
                    </div>
                  ))
              )}

            </div>
          )}
        </div>
      </div>

      {/* Complaint Progress Modal from employee activity */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container/30">
              <h2 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
                Progress Report
                <span className="text-primary text-sm bg-primary/10 px-2 py-0.5 rounded-md truncate max-w-[100px]">
                  {selectedComplaint.complaint_id || selectedComplaint.id}
                </span>
              </h2>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-2 -mr-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold mb-1">Title</p>
                  <p className="text-on-surface text-sm font-medium">{selectedComplaint.title}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold mb-1">Status</p>
                  <p className="text-on-surface text-sm font-medium">{selectedComplaint.status}</p>
                </div>
              </div>

              <h3 className="font-semibold text-on-surface mb-4">Timeline</h3>
              <div className="relative border-l-2 border-outline-variant/30 ml-3 space-y-6">
                {(selectedComplaint.progress || []).length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No progress has been recorded for this complaint yet.</p>
                ) : (
                  (selectedComplaint.progress || []).map((item, idx) => (
                    <div key={idx} className="relative pl-6">
                      <span className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-surface-container-lowest border-2 border-primary flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                      </span>
                      <p className="text-xs font-semibold text-primary mb-1">{new Date(item.date).toLocaleString()}</p>
                      <p className="text-sm text-on-surface font-medium bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 shadow-sm mt-1">{item.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-outline-variant/30 flex justify-end">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-5 py-2 bg-primary text-on-primary font-medium rounded-xl hover:bg-primary/90 transition-colors text-sm"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="py-14 text-center text-on-surface-variant">
      <p className="text-sm">{msg}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeeActivities() {
  const { token } = useAuth();

  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);

  const [search, setSearch]           = useState("");
  const [deptFilter, setDeptFilter]   = useState("");
  const [page, setPage]               = useState(1);
  const PAGE_SIZE = 10;

  const [showAddModal, setShowAddModal]       = useState(false);
  const [selectedEmp, setSelectedEmp]         = useState<Employee | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeesRes, statsRes] = await Promise.all([
        fetch("/api/employees?role=employee", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/employees-with-stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const employeesJson = await employeesRes.json();
      if (!employeesRes.ok) {
        throw new Error(employeesJson.message || "Failed to fetch employees.");
      }

      const statsJson = await statsRes.json();
      if (!statsRes.ok) {
        throw new Error(statsJson.message || "Failed to fetch employee stats.");
      }

      const baseEmployees = (employeesJson.employees || []) as Employee[];
      const statsRows = (statsJson.employees || []) as EmployeeStatsRow[];

      const statsByEmail = new Map(
        statsRows
          .filter((row) => row.email)
          .map((row) => [row.email.toLowerCase(), row]),
      );

      const mergedEmployees = baseEmployees.map((emp) => {
        const stat = statsByEmail.get(emp.email.toLowerCase());
        const fallbackActive =
          stat?.complaintsAssigned?.filter((c) => c.status !== "Solved").length ?? 0;

        return {
          ...emp,
          activeComplaints: stat?.activeComplaints ?? fallbackActive,
          workVisit: stat?.workVisit ?? 0,
          randomSampling: stat?.randomSampling ?? 0,
          outreach: stat?.outreach ?? 0,
        };
      });

      setEmployees(mergedEmployees);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const domains = useMemo(() => {
    const set = new Set(employees.map((e) => e.domain).filter(Boolean));
    return [...set].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees
      .filter((e) => e.role !== "admin")
      .filter((e) => {
        const matchSearch =
          !q ||
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.contact.includes(q) ||
          String(e.id).includes(q) ||
          e.domain?.toLowerCase().includes(q);
        const matchDomain = !deptFilter || e.domain === deptFilter;
        return matchSearch && matchDomain;
      });
  }, [employees, search, deptFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title="Employee Activities">

      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface mb-0.5">Employee Activities</h1>
          <p className="text-sm text-on-surface-variant">
            {loading ? "Loading…" : `${filtered.length} employee${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchEmployees} variant="ghost" size="icon"
            className="h-10 w-10 rounded-xl text-on-surface-variant hover:bg-surface-container" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-sm px-5 h-10 gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Toast */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-error/10 border border-error/20 text-error rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Search by name, ID, email, domain…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
          />
        </div>
        {domains.length > 0 && (
          <div className="relative">
            <SelectWrapper>
              <select
                value={deptFilter}
                onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
                className="pl-4 pr-8 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition appearance-none cursor-pointer"
              >
                <option value="">All Domains</option>
                {domains.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </SelectWrapper>
          </div>
        )}
        {(search || deptFilter) && (
          <button onClick={() => { setSearch(""); setDeptFilter(""); setPage(1); }}
            className="px-3 py-2 text-xs text-on-surface-variant hover:text-error transition flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-surface-container/60 border-b border-outline-variant/30 text-on-surface-variant">
                <th className="font-semibold py-3.5 px-4 whitespace-nowrap w-16">ID</th>
                <th className="font-semibold py-3.5 px-4 whitespace-nowrap">Employee</th>
                <th className="font-semibold py-3.5 px-4 whitespace-nowrap">Email</th>
                <th className="font-semibold py-3.5 px-4 whitespace-nowrap">Active Complaints</th>
                <th className="font-semibold py-3.5 px-4 whitespace-nowrap">Visits / Metrics</th>
                <th className="font-semibold py-3.5 px-4 whitespace-nowrap">Contact</th>
                <th className="font-semibold py-3.5 px-4 whitespace-nowrap">Domain</th>
                <th className="font-semibold py-3.5 px-4 whitespace-nowrap">Joined</th>
                <th className="w-12 py-3.5 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="py-4 px-4">
                        <div className="h-4 bg-surface-container rounded animate-pulse" style={{ width: j === 1 ? "150px" : "90px" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-on-surface-variant">
                    <p className="text-sm">{search || deptFilter ? "No employees match your filters." : "No employees added yet."}</p>
                  </td>
                </tr>
              ) : (
                paginated.map((emp) => (
                  <tr key={emp.id} className="hover:bg-surface-container-low/60 transition-colors group">
                    <td className="py-3.5 px-4 w-28 text-align:left">
                      <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-semibold">
                        {emp.id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button onClick={() => setSelectedEmp(emp)} className="flex items-center gap-2.5 group/btn">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={profilePhotoSrc(emp.profile_photo, emp.profile_photo_updated_at)} alt={emp.name} />
                          <AvatarFallback className={`${avatarCls(emp.id)} text-xs font-semibold`}>
                            {initials(emp.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-primary group-hover/btn:underline underline-offset-2 text-left whitespace-nowrap">
                          {emp.name}
                        </span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant text-sm">{emp.email}</td>
                    <td className="py-3.5 px-4">
                      <Pill cls="bg-blue-100 text-blue-800">
                        {emp.activeComplaints ?? 0} Active
                      </Pill>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant text-sm whitespace-nowrap">
                      <div className="flex flex-col leading-tight">
                        <span className="font-semibold text-on-surface">{emp.workVisit ?? 0} Visits</span>
                        <span className="text-xs text-on-surface-variant">
                          Sampling {emp.randomSampling ?? 0} • Outreach {emp.outreach ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant text-sm whitespace-nowrap">{emp.contact || "—"}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant text-sm">
                      {emp.domain
                        ? <Pill cls="bg-blue-100 text-blue-800">{emp.domain}</Pill>
                        : <span className="text-on-surface-variant/40">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant text-sm whitespace-nowrap">
                      {emp.created_at ? new Date(emp.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedEmp(emp)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="px-5 py-3 border-t border-outline-variant/20 bg-surface-container/30 flex flex-wrap items-center gap-3 justify-between text-sm text-on-surface-variant">
            <span className="text-xs">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg hover:bg-surface-container disabled:opacity-30 transition-colors text-xs">← Prev</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs transition-colors ${p === page ? "bg-primary text-on-primary font-semibold" : "hover:bg-surface-container"}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg hover:bg-surface-container disabled:opacity-30 transition-colors text-xs">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddEmployeeModal
          token={token}
          onClose={() => setShowAddModal(false)}
          onSuccess={(emp) => {
            setShowAddModal(false);
            setSuccessMsg(`Employee "${emp.name}" added successfully — ID ${emp.id}`);
            fetchEmployees();
          }}
        />
      )}

      {selectedEmp && (
        <EmployeeDetailPopup
          emp={selectedEmp}
          token={token}
          onClose={() => setSelectedEmp(null)}
        />
      )}
    </AdminLayout>
  );
}