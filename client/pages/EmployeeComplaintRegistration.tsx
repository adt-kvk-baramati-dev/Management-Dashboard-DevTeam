import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Tag, FileText } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AdminLayout from "../components/AdminLayout";
import { uploadImageToS3 } from "@/lib/s3Upload";
import { COMPLAINT_CATEGORIES } from "../../shared/appConstants";

type ComplaintType = (typeof COMPLAINT_CATEGORIES)[number];

const inputCls = (hasError?: boolean) =>
  cn(
    "h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 disabled:opacity-60 transition-colors",
    hasError && "border-destructive/50 focus:ring-destructive/12",
  );

const textareaCls = (hasError?: boolean) =>
  cn(
    "min-h-[96px] py-2.5 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 disabled:opacity-60 transition-colors",
    hasError && "border-destructive/50 focus:ring-destructive/12",
  );

export default function EmployeeComplaintRegistration() {
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
    complaint_type: COMPLAINT_CATEGORIES[0],
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
    let cancelled = false;
    const prn = form.prn_no.trim();
    const mobile = form.mobile.trim();
    // Require either a sufficiently long PRN or a full 10‑digit mobile number
    if (prn.length < 2 && mobile.length < 10) { setAutoFilled(false); setLookupStatus({ kind: "idle" }); return; }

    const t = setTimeout(async () => {
      if (!token) return;
      setLookupStatus({ kind: "loading", message: prn ? "Searching PRN…" : "Searching mobile…" });
      try {
        // Choose endpoint based on which identifier is present
        const url = prn
          ? `/api/farmers/${encodeURIComponent(prn)}`
          : `/api/farmers/mobile/${encodeURIComponent(mobile)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (cancelled) return;
        if (!res.ok) {
          setAutoFilled(false);
          setForm((s) => ({
            ...s,
            farmer_name: "",
            mobile: "",
            district: "",
            taluka: "",
            village: "",
            // Preserve PRN if lookup was by mobile, otherwise clear it
            prn_no: prn ? s.prn_no : "",
          }));
          setLookupStatus({
            kind: "error",
            message: res.status === 404 ? (prn ? "PRN not found." : "Mobile not found.") : "Lookup failed.",
          });
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
          // If we looked up by mobile, also fill PRN if available
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
  }, [form.prn_no, form.mobile, token]);

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

      setStatus({ kind: "success", message: body?.message ?? "Complaint registered successfully." });
      setSubmitAttempted(false);
      setFieldErrors({});
      setForm((s) => ({ ...s, prn_no: "", farmer_name: "", mobile: "", district: "", taluka: "", village: "", complaint: "", complaint_type: COMPLAINT_CATEGORIES[0], complaint_date: today }));
      setImageFile(null);
      setAutoFilled(false);
      setLookupStatus({ kind: "idle" });
    } catch (e: any) {
      setStatus({ kind: "error", message: e?.message ?? "Unable to submit complaint." });
    }
  };

  return (
    <AdminLayout title="Complaint Registration">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Complaint Registration</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Enter PRN to autofill farmer details, then submit complaint.</p>
          </div>
          <Link to="/employee/dashboard" className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-white px-3.5 py-2 text-sm font-medium text-muted-foreground shadow-sm hover:border-primary/30 hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Farmer Details */}
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border/40">
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
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10"><Tag className="h-4 w-4 text-primary" /></div>
              <h3 className="font-semibold text-foreground">Complaint Type</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COMPLAINT_CATEGORIES.map((t) => (
                <label key={t} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/4 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/6">
                  <input type="radio" name="complaint_type" value={t} checked={form.complaint_type === t} onChange={() => setForm((s) => ({ ...s, complaint_type: t }))} className="h-4 w-4 accent-primary" />
                  <span className="text-sm text-foreground">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Complaint Details */}
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border/40">
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
                  <input id="image" type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                  <label htmlFor="image" className="cursor-pointer">
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

          <Button type="submit" disabled={status.kind === "loading"} className="w-full h-11 rounded-xl font-semibold shadow-sm shadow-primary/20">
            {status.kind === "loading" ? "Submitting..." : "Submit Complaint"}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}
