import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AdminLayout from "../components/AdminLayout";
import { uploadImageToS3 } from "@/lib/s3Upload";

type MapType = "NDVI" | "EVI" | "Crop Stress" | "Water Watch" | "Early Growth" | "VRA" | "Irrigation MMC" | "Irrigation Fasal";

const MAP_API_KEYS: Record<MapType, string> = {
  NDVI: "ndvi", EVI: "evi", "Crop Stress": "crop_stress", "Water Watch": "water_watch",
  "Early Growth": "early_growth", VRA: "vra", "Irrigation MMC": "mmc", "Irrigation Fasal": "fasal",
};

interface MapFeedback { image: File | null; interpretation: string; feedback: string; }
interface MapFeedbackData { [key: string]: MapFeedback; }

const inputCls = (hasError?: boolean) =>
  cn("h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 disabled:opacity-60 transition-colors", hasError && "border-destructive/50 focus:ring-destructive/12");

const textareaCls = (hasError?: boolean) =>
  cn("min-h-[96px] py-2.5 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 disabled:opacity-60 transition-colors", hasError && "border-destructive/50 focus:ring-destructive/12");

export default function EmployeeSampling() {
  const { token } = useAuth();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const mapTypes: MapType[] = ["NDVI", "EVI", "Crop Stress", "Water Watch", "Early Growth", "VRA", "Irrigation MMC", "Irrigation Fasal"];

  // `plantation_date` is used as the visit date entered by the user.
  // `planting_date` will be auto‑filled from the farmer record (read‑only).
  const [form, setForm] = useState({
    prn: "",
    farmer_name: "",
    mobile: "",
    plantation_date: today,
    planting_date: "",
    district: "",
    taluka: "",
    village: "",
    remark: "",
  });
  const [mapFeedback, setMapFeedback] = useState<MapFeedbackData>(mapTypes.reduce((acc, map) => { acc[map] = { image: null, interpretation: "", feedback: "" }; return acc; }, {} as MapFeedbackData));
  const [autoFilled, setAutoFilled] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lookupStatus, setLookupStatus] = useState<{ kind: "idle" | "loading" | "success" | "error"; message?: string }>({ kind: "idle" });
  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "success" | "error"; message?: string }>({ kind: "idle" });

  const clearFieldError = (key: string) => setFieldErrors((prev) => { if (!(key in prev)) return prev; const next = { ...prev }; delete next[key]; return next; });

  const validate = () => {
    const next: Record<string, string> = {};
    const mobile = form.mobile.trim();
    if (!form.prn.trim()) next.prn = "PRN is required.";
    if (!form.farmer_name.trim()) next.farmer_name = "Farmer name is required.";
    if (!form.plantation_date) next.plantation_date = "Visit date is required.";
    if (!mobile) next.mobile = "Mobile number is required.";
    else if (!/^[0-9]{10}$/.test(mobile)) next.mobile = "Mobile number must be 10 digits.";
    if (!form.district.trim()) next.district = "District is required.";
    if (!form.village.trim()) next.village = "Village is required.";
    // Ensure each map feedback includes an image
    mapTypes.forEach((map) => {
      if (!mapFeedback[map].image) {
        next[`${map}_image`] = "Image is required for " + map + ".";
      }
    });
    return next;
  };

  useEffect(() => {
    let cancelled = false;
    const prn = form.prn.trim();
    const mobile = form.mobile.trim();
    // Trigger lookup when either a sufficiently long PRN or a full mobile number is entered
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
          setForm((s) => ({
            ...s,
            farmer_name: "",
            mobile: "",
            district: "",
            taluka: "",
            village: "",
            // Preserve PRN if lookup was by mobile
            prn: prn ? s.prn : "",
          }));
          setLookupStatus({
            kind: "error",
            message: res.status === 404 ? (prn ? "PRN not found in DB." : "Mobile not found.") : "Lookup failed.",
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
          // Auto‑fill planting date from farmer record if present
          planting_date: String(farmer?.planting_date ?? ""),
          // If lookup by mobile, also fill PRN if available
          prn: prn ? s.prn : String(farmer?.prn_no ?? s.prn),
        }));
        setAutoFilled(true);
        setLookupStatus({ kind: "success", message: "Farmer details autofilled." });
      } catch (e: any) {
        if (cancelled) return;
        setAutoFilled(false);
        setLookupStatus({ kind: "error", message: e?.message ?? "Unable to fetch farmer for this PRN." });
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.prn, form.mobile, token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus({ kind: "idle" });
    setSubmitAttempted(true);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) { setStatus({ kind: "error", message: "Please fix the highlighted fields." }); return; }
    if (!token) { setStatus({ kind: "error", message: "Session expired. Please login again." }); return; }

    try {
      setStatus({ kind: "loading", message: "Uploading images and submitting map feedback..." });
      const mapPayloadEntries = await Promise.all(
        mapTypes.map(async (mapType) => {
          const imageFile = mapFeedback[mapType].image;
          const imageUrl = imageFile ? await uploadImageToS3({ file: imageFile, token, purpose: "generic" }) : "";
          return [MAP_API_KEYS[mapType], { image: imageUrl, interpretation: mapFeedback[mapType].interpretation, feedback: mapFeedback[mapType].feedback }] as const;
        }),
      );

      const payload = { prn: form.prn.trim(), farmer_name: form.farmer_name, mobile: form.mobile, plantation_date: form.plantation_date, district: form.district, taluka: form.taluka, village: form.village, maps: Object.fromEntries(mapPayloadEntries), remark: form.remark };

      const res = await fetch("/api/map-feedback", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus({ kind: "error", message: body?.message ?? "Map feedback submission failed." }); return; }

      setStatus({ kind: "success", message: body?.message ?? "Map feedback submitted successfully." });
      setForm((s) => ({ ...s, prn: "", farmer_name: "", mobile: "", plantation_date: today, planting_date: "", district: "", taluka: "", village: "", remark: "" }));
      setMapFeedback(mapTypes.reduce((acc, map) => { acc[map] = { image: null, interpretation: "", feedback: "" }; return acc; }, {} as MapFeedbackData));
      setAutoFilled(false); setLookupStatus({ kind: "idle" }); setSubmitAttempted(false); setFieldErrors({});
    } catch (e: any) {
      setStatus({ kind: "error", message: e?.message ?? "Unable to submit map feedback." });
    }
  };

  const updateMapFeedback = (map: MapType, field: keyof MapFeedback, value: any) =>
    setMapFeedback((prev) => ({ ...prev, [map]: { ...prev[map], [field]: value } }));

  return (
    <AdminLayout title="Random Sampling">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Map Feedback & Random Sampling</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Enter PRN to autofill farmer details, then submit map interpretation feedback.</p>
          </div>
          <Link to="/employee/dashboard" className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-white px-3.5 py-2 text-sm font-medium text-muted-foreground shadow-sm hover:border-primary/30 hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">

          {/* Farmer Details */}
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">
                Farmer Details
              </h3>
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
              {/* PRN Number */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  PRN Number
                </label>
                <input
                  className={inputCls(submitAttempted && !!fieldErrors.prn)}
                  value={form.prn}
                  onChange={(e) => {
                    setAutoFilled(false);
                    setLookupStatus({ kind: "idle" });
                    setForm((s) => ({ ...s, prn: e.target.value }));
                    clearFieldError("prn");
                  }}
                  placeholder="e.g. PRN-001234"
                  autoComplete="off"
                />
          
                {submitAttempted && fieldErrors.prn ? (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    {fieldErrors.prn}
                  </p>
                ) : lookupStatus.kind === "loading" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lookupStatus.message}
                  </p>
                ) : lookupStatus.kind === "success" ? (
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    {lookupStatus.message}
                  </p>
                ) : lookupStatus.kind === "error" ? (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    {lookupStatus.message}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter a PRN to autofill farmer details.
                  </p>
                )}
              </div>
          
              {/* Farmer Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Farmer Name
                </label>
                <input
                  className={inputCls(submitAttempted && !!fieldErrors.farmer_name)}
                  value={form.farmer_name}
                  onChange={(e) => {
                    setForm((s) => ({
                      ...s,
                      farmer_name: e.target.value,
                    }));
                    clearFieldError("farmer_name");
                  }}
                  readOnly={autoFilled}
                  placeholder="Auto-filled from PRN"
                />
                {submitAttempted && fieldErrors.farmer_name && (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    {fieldErrors.farmer_name}
                  </p>
                )}
              </div>
          
              {/* Mobile */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Mobile Number
                </label>
                <input
                  className={inputCls(submitAttempted && !!fieldErrors.mobile)}
                  value={form.mobile}
                  onChange={(e) => {
                    setAutoFilled(false);
                    setForm((s) => ({
                      ...s,
                      mobile: e.target.value,
                    }));
                    clearFieldError("mobile");
                  }}
                  placeholder="10 digit mobile"
                  inputMode="numeric"
                  maxLength={10}
                  readOnly={autoFilled}
                />
                {submitAttempted && fieldErrors.mobile ? (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    {fieldErrors.mobile}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Digits only (no spaces)
                  </p>
                )}
              </div>
          
              {/* Visit Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Visit Date
                </label>
                <input
                  type="date"
                  className={inputCls(
                    submitAttempted && !!fieldErrors.plantation_date
                  )}
                  value={form.plantation_date}
                  onChange={(e) => {
                    setForm((s) => ({
                      ...s,
                      plantation_date: e.target.value,
                    }));
                    clearFieldError("plantation_date");
                  }}
                />
                {submitAttempted && fieldErrors.plantation_date && (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    {fieldErrors.plantation_date}
                  </p>
                )}
              </div>
          
              {/* Planting Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Planting Date
                </label>
                <input
                  type="date"
                  className={inputCls()}
                  value={form.planting_date}
                  readOnly={autoFilled}
                />
              </div>
          
              {/* District */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  District
                </label>
                <input
                  className={inputCls(submitAttempted && !!fieldErrors.district)}
                  value={form.district}
                  onChange={(e) => {
                    setForm((s) => ({
                      ...s,
                      district: e.target.value,
                    }));
                    clearFieldError("district");
                  }}
                  readOnly={autoFilled}
                  placeholder="Auto-filled from PRN"
                />
                {submitAttempted && fieldErrors.district && (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    {fieldErrors.district}
                  </p>
                )}
              </div>
            </div>
          
            {/* Taluka + Village Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Taluka
                </label>
                <input
                  className={inputCls()}
                  value={form.taluka}
                  readOnly={autoFilled}
                  placeholder="Auto-filled from PRN"
                />
              </div>
            
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Village
                </label>
                <input
                  className={inputCls()}
                  value={form.village}
                  readOnly={autoFilled}
                  placeholder="Auto-filled from PRN"
                />
              </div>
            </div>
          </div>

          {/* Map type cards */}
          {mapTypes.map((mapType) => (
            <div key={mapType} className="bg-white rounded-2xl border border-border/50 border-l-4 border-l-primary/40 shadow-sm overflow-hidden">
              <div className="p-6">
                <h3 className="font-semibold text-foreground mb-4">{mapType} Analysis</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {mapType} Image <span className="text-destructive">*</span>
                    </label>
                    <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/20 p-5 text-center hover:border-primary/40 hover:bg-primary/4 transition-all">
                      <input id={`map-image-${mapType}`} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; updateMapFeedback(mapType, "image", f); }} />
                      <label htmlFor={`map-image-${mapType}`} className="cursor-pointer">
                        <p className="text-sm text-muted-foreground">{mapFeedback[mapType].image ? mapFeedback[mapType].image!.name : "Click to upload image"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Interpretation and feedback can be submitted without an image.</p>
                      </label>
                    </div>
                    {/* Image required error */}
                    {fieldErrors[`${mapType}_image`] && (
                      <p className="mt-1 text-xs font-medium text-destructive">
                        {fieldErrors[`${mapType}_image`]}
                      </p>
                    )}
                    </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Interpretation (optional)</label>
                    <input type="text" className={inputCls()} value={mapFeedback[mapType].interpretation} onChange={(e) => updateMapFeedback(mapType, "interpretation", e.target.value)} placeholder="Enter interpretation of this map…" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Feedback (optional)</label>
                    <textarea className={textareaCls()} value={mapFeedback[mapType].feedback} onChange={(e) => updateMapFeedback(mapType, "feedback", e.target.value)} placeholder="Provide feedback for this map layer…" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Overall Assessment */}
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border/40">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10"><ClipboardList className="h-4 w-4 text-primary" /></div>
              <h3 className="font-semibold text-foreground">Overall Assessment</h3>
            </div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Final Remark (optional)</label>
            <textarea className={textareaCls()} value={form.remark} onChange={(e) => setForm((s) => ({ ...s, remark: e.target.value }))} placeholder="Overall remark for all maps and analysis…" />
          </div>

          {status.kind !== "idle" && (
            <div className={cn(
              status.kind === "success" && "rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800",
              status.kind === "error" && "rounded-xl border border-destructive/20 bg-destructive/6 p-3.5 text-sm font-medium text-destructive",
              status.kind === "loading" && "rounded-xl border border-border/50 bg-muted/40 p-3.5 text-sm text-muted-foreground",
            )}>{status.message}</div>
          )}

          <Button type="submit" disabled={status.kind === "loading"} className="w-full h-11 rounded-xl font-semibold shadow-sm shadow-primary/20">
            {status.kind === "loading" ? "Submitting…" : "Submit Map Feedback"}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}
