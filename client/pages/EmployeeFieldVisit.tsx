import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Droplets, Thermometer, Sprout, Bug, Smartphone, Shield, TrendingUp, MapPin } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AdminLayout from "../components/AdminLayout";
import { uploadImageToS3 } from "@/lib/s3Upload";

type SoilCondition = "Yes" | "No" | "Not Sure";
type SoilTemperature = "Cool" | "Moderate" | "Hot";
type SoilMoisture = "Dry" | "Adequate" | "Excess";
type YesNo = "Yes" | "No";
type DiseaseSymptom = "Leaf spots" | "Wilting" | "Fruit rot" | "Other";
type CropHealth = "Healthy" | "Moderate" | "Weak";

const inputCls = (hasError?: boolean) =>
  cn("h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 disabled:opacity-60 transition-colors", hasError && "border-destructive/50 focus:ring-destructive/12");

const textareaCls = (hasError?: boolean) =>
  cn("min-h-[96px] py-2.5 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 disabled:opacity-60 transition-colors", hasError && "border-destructive/50 focus:ring-destructive/12");

const selectCls = (hasError?: boolean) =>
  cn("h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 disabled:opacity-60 transition-colors", hasError && "border-destructive/50 focus:ring-destructive/12");

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border/40">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ObservationPointSection({
  title,
  prefix,
  form,
  setForm,
  files,
  setFiles,
  geoTagImage,
  setGeoTagImage,
}: {
  title: string;
  prefix: "point_a" | "point_b" | "point_c";
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  files: any;
  setFiles: React.Dispatch<React.SetStateAction<any>>;
  geoTagImage?: File | null;
  setGeoTagImage?: (file: File | null) => void;
}) {
  const tillersKey = prefix === "point_a" ? "tillers" : `${prefix}_tillers`;
  const heightKey = prefix === "point_a" ? "height" : `${prefix}_height`;
  const girthKey = prefix === "point_a" ? "girth" : `${prefix}_girth`;
  const greenLeavesKey = `${prefix}_green_leaves`;

  const handleFileChange = (field: string, file: File | null) => {
    if (prefix === "point_a" && field === "geo_tag_image") {
      if (setGeoTagImage) setGeoTagImage(file);
    } else {
      setFiles((prev: any) => ({ ...prev, [`${prefix}_${field}`]: file }));
    }
  };

  const getFileName = (field: string) => {
    if (prefix === "point_a" && field === "geo_tag_image") {
      return geoTagImage ? geoTagImage.name : null;
    }
    return files[`${prefix}_${field}`] ? files[`${prefix}_${field}`].name : null;
  };

  return (
    <div className="bg-muted/10 rounded-xl p-4 border border-border/40 space-y-4">
      <h4 className="font-semibold text-sm text-foreground/80">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            <span className="block text-slate-700">प्रत्येक बेटातील फुटव्यांची संख्या</span>
            <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Number of Tillers per Clump</span>
          </label>
          <input
            type="number"
            className="h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 transition-colors"
            value={form[tillersKey] || ""}
            onChange={(e) => setForm((s: any) => ({ ...s, [tillersKey]: e.target.value }))}
            placeholder="Enter number"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            <span className="block text-slate-700">ऊसाची सरासरी उंची (से.मी./मी.)</span>
            <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Average Cane Height (cm/m)</span>
          </label>
          <input
            type="number"
            className="h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 transition-colors"
            value={form[heightKey] || ""}
            onChange={(e) => setForm((s: any) => ({ ...s, [heightKey]: e.target.value }))}
            placeholder="Enter height"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            <span className="block text-slate-700">ऊसाचा सरासरी घेर / जाडी (से.मी.)</span>
            <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Average Cane Girth (cm)</span>
          </label>
          <input
            type="number"
            className="h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 transition-colors"
            value={form[girthKey] || ""}
            onChange={(e) => setForm((s: any) => ({ ...s, [girthKey]: e.target.value }))}
            placeholder="Enter girth"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            <span className="block text-slate-700">हिरव्या पानांची सरासरी संख्या</span>
            <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Average Number of Green Leaves</span>
          </label>
          <input
            type="number"
            className="h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 transition-colors"
            value={form[greenLeavesKey] || ""}
            onChange={(e) => setForm((s: any) => ({ ...s, [greenLeavesKey]: e.target.value }))}
            placeholder="Enter count"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            <span className="block text-slate-700">जिओ-टॅग केलेला फोटो अपलोड करा</span>
            <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Geo-tagged Image Upload</span>
          </label>
          <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/20 p-3 text-center hover:border-primary/40 transition-all">
            <input
              id={`${prefix}-geo-tag`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange("geo_tag_image", e.target.files?.[0] ?? null)}
            />
            <label htmlFor={`${prefix}-geo-tag`} className="cursor-pointer block text-xs">
              <span className="text-muted-foreground block truncate">
                {getFileName("geo_tag_image") || "Click to upload geo-tag image"}
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            <span className="block text-slate-700">मोजपट्टीसह फोटो</span>
            <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Measurement Scale Image Upload</span>
          </label>
          <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/20 p-3 text-center hover:border-primary/40 transition-all">
            <input
              id={`${prefix}-scale-image`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange("scale_image", e.target.files?.[0] ?? null)}
            />
            <label htmlFor={`${prefix}-scale-image`} className="cursor-pointer block text-xs">
              <span className="text-muted-foreground block truncate">
                {getFileName("scale_image") || "Click to upload measuring scale image"}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeFieldVisit() {
  const { token } = useAuth();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [form, setForm] = useState({
    prn: "", mobile_no: "", visit_date: today, farmer_name: "", district: "", taluka: "", village: "",
    soil_condition: "" as SoilCondition | "", soil_temp: "Moderate" as SoilTemperature,
    soil_moisture: "Adequate" as SoilMoisture, irrigation: "", fertilizer: "",
    deficiency: [] as string[], pest_attack: "" as YesNo | "", disease_symptoms: "" as DiseaseSymptom | "",
    krushik: "" as YesNo | "", reason: "", spray: "", health: "Healthy" as CropHealth,
    germination: "", tillers: "", height: "", girth: "", observations: "", remark: "",
    // New fields
    planting_date: "",
    harvesting_date: "",
    area: "",
    disease_name: "",
    rainfall_last_week: "",
    rainfall_last_week_qty: "",
    irrigation_advisories: "",
    last_irrigation_date: "",
    irrigation_advisories_useful: "",
    irrigation_advisories_useful_remark: "",
    irrigation_method: "",
    iot_sensor_working: "",
    fertilizer_advisories: "",
    follow_fertilizer_advisory: "",
    applied_fertilizer_recently: "",
    nutrient_deficiency: "",
    pest_disease_alerts: "",
    pest_disease_observed_name: "",
    pest_disease_alerts_useful: "",
    pest_attack_name: "",
    disease_observed: "",
    last_spray_date: "",
    spray_challenges: "",
    spray_challenges_remark: "",
    vegetative_maps_displayed: "",
    crop_health_maps_match: "",
    crop_health_maps_match_remark: "",
    ai_recommendations_satisfaction: "",
    point_a_green_leaves: "",
    point_b_tillers: "",
    point_b_height: "",
    point_b_girth: "",
    point_b_green_leaves: "",
    point_c_tillers: "",
    point_c_height: "",
    point_c_girth: "",
    point_c_green_leaves: "",
    app_benefits: "",
    app_challenges: "",
    app_suggestions: "",
  });

  const [diseaseImage, setDiseaseImage] = useState<File | null>(null);
  const [geoTagImage, setGeoTagImage] = useState<File | null>(null);
  const [files, setFiles] = useState<{
    nutrient_deficiency_image: File | null;
    pest_disease_image: File | null;
    pest_attack_image: File | null;
    point_a_scale_image: File | null;
    point_b_geo_tag_image: File | null;
    point_b_scale_image: File | null;
    point_c_geo_tag_image: File | null;
    point_c_scale_image: File | null;
  }>({
    nutrient_deficiency_image: null,
    pest_disease_image: null,
    pest_attack_image: null,
    point_a_scale_image: null,
    point_b_geo_tag_image: null,
    point_b_scale_image: null,
    point_c_geo_tag_image: null,
    point_c_scale_image: null,
  });
  const [autoFilled, setAutoFilled] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lookupStatus, setLookupStatus] = useState<{ kind: "idle" | "loading" | "success" | "error"; message?: string }>({ kind: "idle" });
  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "success" | "error"; message?: string }>({ kind: "idle" });

  const clearFieldError = (key: string) => setFieldErrors((prev) => { if (!(key in prev)) return prev; const next = { ...prev }; delete next[key]; return next; });

  // Validation is temporarily disabled – all fields are optional for now.
  const validate = () => {
    // Return an empty error object so the form can always submit.
    return {} as Record<string, string>;
  };

  useEffect(() => {
    let cancelled = false;
  
    const prn = form.prn.trim();
    const mobile = form.mobile_no.trim();
  
    if (prn.length < 2 && mobile.length < 10) {
      setAutoFilled(false);
      setLookupStatus({ kind: "idle" });
      return;
    }
  
    const timer = setTimeout(async () => {
      if (!token) return;
  
      setLookupStatus({
        kind: "loading",
        message: "Searching farmer..."
      });
  
      try {
        let url = "";
  
        if (prn) {
          url = `/api/farmers/${encodeURIComponent(prn)}`;
        } else {
          url = `/api/farmers/mobile/${encodeURIComponent(mobile)}`;
        }
  
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        if (cancelled) return;
  
        if (!res.ok) {
          setAutoFilled(false);
  
          setForm((s) => ({
            ...s,
            farmer_name: "",
            district: "",
            taluka: "",
            village: "",
            prn: "",
            mobile_no: "",
          }));
  
          setLookupStatus({
            kind: "error",
            message:
              res.status === 404
                ? "Farmer not found."
                : "Lookup failed.",
          });
  
          return;
        }
  
        const body = await res.json();
  
        const farmer = body?.farmer;
  
        setForm((s) => ({
          ...s,
          farmer_name: farmer?.name || "",
          district: farmer?.district || "",
          taluka: farmer?.taluka || "",
          village: farmer?.village || "",
          prn: farmer?.prn_no || s.prn,
          mobile_no: farmer?.phone || farmer?.mobile || s.mobile_no,
          area: farmer?.area || "",
          planting_date: farmer?.planting_date ? new Date(farmer.planting_date).toISOString().slice(0, 10) : "",
          harvesting_date: farmer?.expected_harvesting_date
            ? new Date(farmer.expected_harvesting_date).toISOString().slice(0, 10)
            : (farmer?.harvesting_date ? new Date(farmer.harvesting_date).toISOString().slice(0, 10) : ""),
        }));
  
        setAutoFilled(true);
  
        setLookupStatus({
          kind: "success",
          message: "Farmer details autofilled.",
        });
      } catch (err: any) {
        if (cancelled) return;
  
        setAutoFilled(false);
  
        setLookupStatus({
          kind: "error",
          message:
            err?.message ||
            "Unable to fetch farmer details.",
        });
      }
    }, 500);
  
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.prn, form.mobile_no, token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus({ kind: "idle" });
    setSubmitAttempted(true);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) { setStatus({ kind: "error", message: "Please fix the highlighted fields." }); return; }
    if (!token) { setStatus({ kind: "error", message: "Session expired. Please login again." }); return; }

    try {
      setStatus({ kind: "loading", message: "Uploading images..." });
      
      const fileUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(files)) {
        if (file) {
          fileUrls[key] = await uploadImageToS3({ file, token, purpose: "field-visit" });
        }
      }

      let diseaseImageUrl = "";
      let geoTagImageUrl = "";
      if (diseaseImage) diseaseImageUrl = await uploadImageToS3({ file: diseaseImage, token, purpose: "field-visit" });
      if (geoTagImage) geoTagImageUrl = await uploadImageToS3({ file: geoTagImage, token, purpose: "field-visit" });

      setStatus({ kind: "loading", message: "Submitting field visit..." });
      const payload = {
        ...form,
        prn: form.prn.trim(),
        deficiency: form.deficiency.join(","),
        disease_image: diseaseImageUrl || fileUrls.pest_disease_image || "",
        geo_tag_image: geoTagImageUrl || "",
        nutrient_deficiency_image: fileUrls.nutrient_deficiency_image || "",
        pest_disease_image: fileUrls.pest_disease_image || diseaseImageUrl || "",
        pest_attack_image: fileUrls.pest_attack_image || "",
        point_a_geo_tag_image: geoTagImageUrl || "",
        point_a_scale_image: fileUrls.point_a_scale_image || "",
        point_b_geo_tag_image: fileUrls.point_b_geo_tag_image || "",
        point_b_scale_image: fileUrls.point_b_scale_image || "",
        point_c_geo_tag_image: fileUrls.point_c_geo_tag_image || "",
        point_c_scale_image: fileUrls.point_c_scale_image || "",
      };

      const res = await fetch("/api/field-visits", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus({ kind: "error", message: body?.message ?? "Field visit submission failed." }); return; }

      setStatus({ kind: "success", message: body?.message ?? "Field visit recorded successfully." });
      setForm((s) => ({
        ...s, prn: "", visit_date: today, farmer_name: "", district: "", taluka: "", village: "", soil_condition: "", soil_temp: "Moderate", soil_moisture: "Adequate", irrigation: "", fertilizer: "", deficiency: [], pest_attack: "", disease_symptoms: "", krushik: "", reason: "", spray: "", health: "Healthy", germination: "", tillers: "", height: "", girth: "", observations: "", remark: "",
        planting_date: "",
        harvesting_date: "",
        area: "",
        rainfall_last_week: "",
        rainfall_last_week_qty: "",
        irrigation_advisories: "",
        last_irrigation_date: "",
        irrigation_advisories_useful: "",
        irrigation_advisories_remark: "",
        irrigation_method: "",
        soil_moisture_match: "",
        iot_sensor_working: "",
        fertilizer_advisories: "",
        follow_fertilizer_advisory: "",
        applied_fertilizer_recently: "",
        fertilizer_type: "",
        fertilizer_quantity: "",
        fertilizer_application_date: "",
        nutrient_deficiency: "",
        nutrient_deficiency_type: "",
        pest_disease_alerts: "",
        pest_disease_observed_name: "",
        pest_disease_alerts_useful: "",
        pest_attack_name: "",
        disease_observed: "",
        disease_name: "",
        last_spray_date: "",
        spray_type: "",
        spray_dosage: "",
        spray_challenges: "",
        spray_challenges_remark: "",
        vegetative_maps_displayed: "",
        crop_health_maps_match: "",
        crop_health_maps_match_remark: "",
        ai_recommendations_satisfaction: "",
        point_a_green_leaves: "",
        point_b_tillers: "",
        point_b_height: "",
        point_b_girth: "",
        point_b_green_leaves: "",
        point_c_tillers: "",
        point_c_height: "",
        point_c_girth: "",
        point_c_green_leaves: "",
        crop_health_condition: "",
        app_benefits: "",
        app_challenges: "",
        app_suggestions: "",
        farmer_observations: ""
      }));
      setFiles({
        nutrient_deficiency_image: null,
        pest_disease_image: null,
        pest_attack_image: null,
        point_a_scale_image: null,
        point_b_geo_tag_image: null,
        point_b_scale_image: null,
        point_c_geo_tag_image: null,
        point_c_scale_image: null,
      });
      setDiseaseImage(null); setGeoTagImage(null); setAutoFilled(false); setLookupStatus({ kind: "idle" }); setSubmitAttempted(false); setFieldErrors({});
    } catch (e: any) {
      setStatus({ kind: "error", message: e?.message ?? "Unable to submit field visit." });
    }
  };

  const toggleDeficiency = (value: string) => setForm((s) => ({ ...s, deficiency: s.deficiency.includes(value) ? s.deficiency.filter((d) => d !== value) : [...s.deficiency, value] }));

  const optionCls = (active?: boolean) => cn("flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/4 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/6", active && "border-destructive/40");

  return (
    <AdminLayout title="Field Visit">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Farmer Field Visit Observation</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Enter PRN to autofill farmer details, then record field observations.</p>
          </div>
          <Link to="/employee/dashboard" className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-white px-3.5 py-2 text-sm font-medium text-muted-foreground shadow-sm hover:border-primary/30 hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* 1. Farmer Details */}
            <SectionCard icon={User} title="Farmer Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
                {/* PRN */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    PRN Number
                  </label>
            
                  <input
                    className={inputCls()}
                    value={form.prn}
                    onChange={(e) => {
                      setAutoFilled(false);
                      setLookupStatus({ kind: "idle" });
            
                      setForm((s) => ({
                        ...s,
                        prn: e.target.value,
                      }));
                    }}
                    placeholder="PRN-001234"
                  />
                </div>
            
                {/* Mobile */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Mobile Number
                  </label>
            
                  <input
                    type="tel"
                    className={inputCls()}
                    value={form.mobile_no}
                    onChange={(e) => {
                      setAutoFilled(false);
                      setLookupStatus({ kind: "idle" });
            
                      setForm((s) => ({
                        ...s,
                        mobile_no: e.target.value,
                      }));
                    }}
                    placeholder="9876543210"
                  />
                </div>
            
                <div className="sm:col-span-2">
                  {lookupStatus.kind === "loading" ? (
                    <p className="text-xs text-muted-foreground">
                      {lookupStatus.message}
                    </p>
                  ) : lookupStatus.kind === "success" ? (
                    <p className="text-xs font-medium text-emerald-600">
                      {lookupStatus.message}
                    </p>
                  ) : lookupStatus.kind === "error" ? (
                    <p className="text-xs font-medium text-destructive">
                      {lookupStatus.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Enter PRN or Mobile Number to autofill farmer details.
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
                      submitAttempted && !!fieldErrors.visit_date
                    )}
                    value={form.visit_date}
                    onChange={(e) => {
                      setForm((s) => ({
                        ...s,
                        visit_date: e.target.value,
                      }));
                    }}
                  />
                </div>
            
                {/* Farmer Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Farmer Name
                  </label>
            
                  <input
                    className={inputCls()}
                    value={form.farmer_name}
                    readOnly={autoFilled}
                    placeholder="Auto-filled"
                  />
                </div>
            
                {/* District */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    District
                  </label>
            
                  <input
                    className={inputCls()}
                    value={form.district}
                    readOnly={autoFilled}
                    placeholder="Auto-filled"
                  />
                </div>
            
                {/* Taluka */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Taluka
                  </label>
            
                  <input
                    className={inputCls()}
                    value={form.taluka}
                    readOnly={autoFilled}
                    placeholder="Auto-filled"
                  />
                </div>
            
                {/* Village */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Village
                  </label>
            
                  <input
                    className={inputCls()}
                    value={form.village}
                    readOnly={autoFilled}
                    placeholder="Auto-filled"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Planting Date
                  </label>
            
                  <input
                    className={inputCls()}
                    value={form.planting_date}
                    readOnly={autoFilled}
                    placeholder="Auto-filled"
                  />
                </div>
              </div>
            </SectionCard>
          
          
          

          <div className="border-t border-border/85 my-8 pt-6">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <span>क्षेत्र भेट प्रश्नावली</span>
              <span className="text-sm font-normal text-muted-foreground italic">/ Field Visit Questionnaire</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Please complete the following details as observed during the field visit / कृपया क्षेत्र भेटीदरम्यान निरीक्षण केल्यानुसार खालील तपशील पूर्ण करा.</p>
          </div>

          
          {/* B. Irrigation Management */}
          <SectionCard icon={Droplets} title="B. Irrigation Management / सिंचन व्यवस्थापन">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">मागील आठवड्यात पाऊस झाला आहे का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Has there been any rainfall during past week?</span>
                </label>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="rainfall_last_week"
                        value={val}
                        checked={form.rainfall_last_week === val}
                        onChange={() => setForm((s) => ({ ...s, rainfall_last_week: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>
                {form.rainfall_last_week === "Yes" && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1 mt-2">
                      <span className="block text-slate-700">अंदाजे पर्जन्यमान (मिमी)</span>
                      <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Approx. Rainfall (mm)</span>
                    </label>
                    <input
                      type="number"
                      className={inputCls()}
                      value={form.rainfall_last_week_qty}
                      onChange={(e) => setForm((s) => ({ ...s, rainfall_last_week_qty: e.target.value }))}
                      placeholder="Enter rainfall in mm"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">कृषिक अॅपद्वारे सिंचन सल्ला प्राप्त झाला होता का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Did you receive irrigation advisories through Krushik App?</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="irrigation_advisories"
                        value={val}
                        checked={form.irrigation_advisories === val}
                        onChange={() => setForm((s) => ({ ...s, irrigation_advisories: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">शेवटचे सिंचन कधी दिले? (दिनांक / किती दिवसांपूर्वी)</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">When was the last irrigation provided? (Date / Number of days ago)</span>
                </label>
                <input
                  type="text"
                  className={inputCls()}
                  value={form.last_irrigation_date}
                  onChange={(e) => setForm((s) => ({ ...s, last_irrigation_date: e.target.value }))}
                  placeholder="e.g. 15-06-2026 or 4 days ago"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">सिंचन सल्ला उपयुक्त वाटला का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Were the irrigation advisories useful?</span>
                </label>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="irrigation_advisories_useful"
                        value={val}
                        checked={form.irrigation_advisories_useful === val}
                        onChange={() => setForm((s) => ({ ...s, irrigation_advisories_useful: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  className={inputCls()}
                  value={form.irrigation_advisories_useful_remark}
                  onChange={(e) => setForm((s) => ({ ...s, irrigation_advisories_useful_remark: e.target.value }))}
                  placeholder="Remark / टिप्पणी (optional)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">कोणती सिंचन पद्धत वापरली जाते?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Which irrigation method is being used?</span>
                </label>
                <select
                  value={form.irrigation_method}
                  onChange={(e) => setForm((s) => ({ ...s, irrigation_method: e.target.value }))}
                  className={selectCls()}
                >
                  <option value="">Select option</option>
                  <option value="Drip">Drip / ठिबक सिंचन</option>
                  <option value="Furrow">Furrow / सरी सिंचन</option>
                  <option value="Flood">Flood / पाट सिंचन</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">IoT सेन्सर योग्य प्रकारे कार्यरत आहे का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Is the IoT sensor functioning properly?</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="iot_sensor_working"
                        value={val}
                        checked={form.iot_sensor_working === val}
                        onChange={() => setForm((s) => ({ ...s, iot_sensor_working: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* C. Fertilizer Management */}
          <SectionCard icon={Sprout} title="C. Fertilizer Management / खत व्यवस्थापन">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">कृषिक अॅपद्वारे खत व्यवस्थापन सल्ला प्राप्त झाला होता का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Did you receive fertilizer advisories through Krushik App?</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="fertilizer_advisories"
                        value={val}
                        checked={form.fertilizer_advisories === val}
                        onChange={() => setForm((s) => ({ ...s, fertilizer_advisories: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">कृषिक अॅपद्वारे दिलेल्या खत सल्ल्याचे पालन केले का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Did you follow the fertilizer advisory provided through Krushik App?</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="follow_fertilizer_advisory"
                        value={val}
                        checked={form.follow_fertilizer_advisory === val}
                        onChange={() => setForm((s) => ({ ...s, follow_fertilizer_advisory: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">अलीकडे खतांचा वापर केला आहे का? (अॅपद्वारे दिलेल्या खत सल्ल्याने)</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Have you applied fertilizer recently as per Krushik App advisory?</span>
                </label>
                <select
                  value={form.applied_fertilizer_recently}
                  onChange={(e) => setForm((s) => ({ ...s, applied_fertilizer_recently: e.target.value }))}
                  className={selectCls()}
                >
                  <option value="">Select option</option>
                  <option value="Organic">Organic / सेंद्रिय</option>
                  <option value="Chemical">Chemical / रासायनिक</option>
                  <option value="Both">Both / दोन्ही</option>
                  <option value="None">None / नाही</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">अन्नद्रव्य कमतरतेची लक्षणे दिसून आली आहेत का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Have you observed any nutrient deficiency symptoms?</span>
                </label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="nutrient_deficiency"
                        value={val}
                        checked={form.nutrient_deficiency === val}
                        onChange={() => setForm((s) => ({ ...s, nutrient_deficiency: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>

                {form.nutrient_deficiency === "Yes" && (
                  <div className="space-y-4 border-l-2 border-primary/20 pl-4 mt-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        <span className="block text-slate-700">कमतरतेच्या लक्षणांचा फोटो अपलोड करा</span>
                        <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Upload deficiency symptom photo</span>
                      </label>
                      <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/20 p-4 text-center hover:border-primary/40 transition-all">
                        <input
                          id="nutrient-deficiency-image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setFiles((prev) => ({ ...prev, nutrient_deficiency_image: e.target.files?.[0] ?? null }))}
                        />
                        <label htmlFor="nutrient-deficiency-image" className="cursor-pointer">
                          <p className="text-sm text-muted-foreground">
                            {files.nutrient_deficiency_image ? files.nutrient_deficiency_image.name : "Click to upload deficiency photo"}
                          </p>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* D. Pest & Disease Monitoring */}
          <SectionCard icon={Bug} title="D. Pest & Disease Monitoring / कीड आणि रोग नियंत्रण">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">कृषिक अॅपद्वारे कीड/रोग सूचना प्राप्त झाली होती का? आणि लक्षणे आढळली का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Did you receive pest/disease alerts through Krushik App, and observed symptoms?</span>
                </label>
                <select
                  value={form.pest_disease_alerts}
                  onChange={(e) => setForm((s) => ({ ...s, pest_disease_alerts: e.target.value }))}
                  className={selectCls()}
                >
                  <option value="">Select option</option>
                  <option value="Yes_Observed">होय, सूचना प्राप्त झाली व शेतात आढळली / Yes, alert received and observed</option>
                  <option value="Yes_Not_Observed">होय, सूचना प्राप्त झाली पण शेतात आढळली नाही / Yes, alert received but not observed</option>
                  <option value="No_Observed">सूचना प्राप्त झाली नाही पण शेतात आढळली / No alert received, but observed</option>
                  <option value="No_Not_Observed">सूचना प्राप्त झाली नाही आणि शेतातही आढळली नाही / No alert received and not observed</option>
                </select>
              </div>

              {(form.pest_disease_alerts === "Yes_Observed" || form.pest_disease_alerts === "No_Observed") && (
                <div className="space-y-4 border-l-2 border-primary/20 pl-4 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      <span className="block text-slate-700">आढळल्यास कीड/रोगाचे नाव नमूद करा</span>
                      <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Mention pest/disease name</span>
                    </label>
                    <input
                      type="text"
                      className={inputCls()}
                      value={form.pest_disease_observed_name}
                      onChange={(e) => setForm((s) => ({ ...s, pest_disease_observed_name: e.target.value }))}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      <span className="block text-slate-700">फोटो अपलोड करा</span>
                      <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Upload photo</span>
                    </label>
                    <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/20 p-4 text-center hover:border-primary/40 transition-all">
                      <input
                        id="pest-disease-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setFiles((prev) => ({ ...prev, pest_disease_image: e.target.files?.[0] ?? null }))}
                      />
                      <label htmlFor="pest-disease-image" className="cursor-pointer">
                        <p className="text-sm text-muted-foreground">
                          {files.pest_disease_image ? files.pest_disease_image.name : "Click to upload photo"}
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">कीड/रोग सूचना उपयुक्त वाटली का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Were the pest/disease alerts useful?</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="pest_disease_alerts_useful"
                        value={val}
                        checked={form.pest_disease_alerts_useful === val}
                        onChange={() => setForm((s) => ({ ...s, pest_disease_alerts_useful: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>
              </div>

              {form.pest_attack === "Yes" && (
                <div className="space-y-4 border-l-2 border-primary/20 pl-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      <span className="block text-slate-700">किडीचे नाव</span>
                      <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Pest Name</span>
                    </label>
                    <input
                      type="text"
                      className={inputCls()}
                      value={form.pest_attack_name}
                      onChange={(e) => setForm((s) => ({ ...s, pest_attack_name: e.target.value }))}
                      placeholder="Enter pest name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      <span className="block text-slate-700">किडीचा फोटो अपलोड करा</span>
                      <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Upload pest photo</span>
                    </label>
                    <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/20 p-4 text-center hover:border-primary/40 transition-all">
                      <input
                        id="pest-attack-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setFiles((prev) => ({ ...prev, pest_attack_image: e.target.files?.[0] ?? null }))}
                      />
                      <label htmlFor="pest-attack-image" className="cursor-pointer">
                        <p className="text-sm text-muted-foreground">
                          {files.pest_attack_image ? files.pest_attack_image.name : "Click to upload pest photo"}
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">पिकावर रोगाची लक्षणे दिसून आली आहेत का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Have you observed any disease symptoms?</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="disease_observed"
                        value={val}
                        checked={form.disease_observed === val}
                        onChange={() => setForm((s) => ({ ...s, disease_observed: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">शेवटची फवारणी कधी केली?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">When was the last spray applied?</span>
                </label>
                <input
                  type="date"
                  className={inputCls()}
                  value={form.last_spray_date}
                  onChange={(e) => setForm((s) => ({ ...s, last_spray_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">फवारणी करताना काही अडचणी आल्या का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Were there any spraying challenges?</span>
                </label>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="spray_challenges"
                        value={val}
                        checked={form.spray_challenges === val}
                        onChange={() => setForm((s) => ({ ...s, spray_challenges: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  className={inputCls()}
                  value={form.spray_challenges_remark}
                  onChange={(e) => setForm((s) => ({ ...s, spray_challenges_remark: e.target.value }))}
                  placeholder="Challenge details / टिप्पणी (optional)"
                />
              </div>
            </div>
          </SectionCard>

          {/* E. Crop Health & NDVI/EVI Validation */}
          <SectionCard icon={TrendingUp} title="E. Crop Health & NDVI/EVI Validation / पीक आरोग्य आणि NDVI/EVI पडताळणी">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">कृषिक अॅपमध्ये दर्शवलेले वनस्पती निर्देशांक (NDVI, EVI, WWM, CSM) योग्यरित्या प्रदर्शित होत आहेत का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Are the Vegetative maps (NDVI, EVI, WWM, CSM) displayed in the Krushik App?</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="vegetative_maps_displayed"
                        value={val}
                        checked={form.vegetative_maps_displayed === val}
                        onChange={() => setForm((s) => ({ ...s, vegetative_maps_displayed: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">NDVI/EVI आधारित पीक आरोग्य नकाशा प्रत्यक्ष क्षेत्र परिस्थितीशी जुळतो का?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Do the Crop Health Maps (NDVI/EVI) accurately represent the actual field conditions?</span>
                </label>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {["Yes", "No"].map((val) => (
                    <label key={val} className={optionCls()}>
                      <input
                        type="radio"
                        name="crop_health_maps_match"
                        value={val}
                        checked={form.crop_health_maps_match === val}
                        onChange={() => setForm((s) => ({ ...s, crop_health_maps_match: val }))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{val === "Yes" ? "होय / Yes" : "नाही / No"}</span>
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  className={inputCls()}
                  value={form.crop_health_maps_match_remark}
                  onChange={(e) => setForm((s) => ({ ...s, crop_health_maps_match_remark: e.target.value }))}
                  placeholder="Remark / टिप्पणी (optional)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">कृषिक अॅपद्वारे दिलेल्या AI आधारित सल्ल्यांबाबत आपले एकूण समाधान काय आहे?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Overall, are you satisfied with AI-based recommendations provided through Krushik App?</span>
                </label>
                <select
                  value={form.ai_recommendations_satisfaction}
                  onChange={(e) => setForm((s) => ({ ...s, ai_recommendations_satisfaction: e.target.value }))}
                  className={selectCls()}
                >
                  <option value="">Select option</option>
                  <option value="Very_Satisfied">Very Satisfied / अत्यंत समाधानी</option>
                  <option value="Satisfied">Satisfied / समाधानी</option>
                  <option value="Neutral">Neutral / तटस्थ</option>
                  <option value="Unsatisfied">Unsatisfied / असमाधानी</option>
                </select>
              </div>
            </div>
          </SectionCard>

          {/* F. Observation Point A */}
          <SectionCard icon={MapPin} title="F. Observation Point A – Border/Corner Area / निरीक्षण बिंदू A – शेताचा कड / कोपरा भाग">
            <ObservationPointSection
              title="Observation Point A Details"
              prefix="point_a"
              form={form}
              setForm={setForm}
              files={files}
              setFiles={setFiles}
              geoTagImage={geoTagImage}
              setGeoTagImage={setGeoTagImage}
            />
          </SectionCard>

          {/* G. Observation Point B */}
          <SectionCard icon={MapPin} title="G. Observation Point B - Field Centre Area / निरीक्षण बिंदू B – शेताचा मध्य भाग">
            <ObservationPointSection
              title="Observation Point B Details"
              prefix="point_b"
              form={form}
              setForm={setForm}
              files={files}
              setFiles={setFiles}
            />
          </SectionCard>

          {/* H. Observation Point C */}
          <SectionCard icon={MapPin} title="H. Observation Point C - Opposite Corner / Stress Zone / निरीक्षण बिंदू C – विरुद्ध टोक">
            <ObservationPointSection
              title="Observation Point C Details"
              prefix="point_c"
              form={form}
              setForm={setForm}
              files={files}
              setFiles={setFiles}
            />
          </SectionCard>

          {/* I. Farmer Feedback */}
          <SectionCard icon={Smartphone} title="I. Farmer Feedback / शेतकऱ्याचा अभिप्राय">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">कृषिक अॅप वापरल्यामुळे कोणते फायदे झाले?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">What benefits have you observed from using the Krushik App?</span>
                </label>
                <textarea
                  className={textareaCls()}
                  value={form.app_benefits}
                  onChange={(e) => setForm((s) => ({ ...s, app_benefits: e.target.value }))}
                  placeholder="Describe benefits…"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">कृषिक अॅप वापरताना कोणत्या अडचणी आल्या?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">What challenges have you faced while using the Krushik App?</span>
                </label>
                <textarea
                  className={textareaCls()}
                  value={form.app_challenges}
                  onChange={(e) => setForm((s) => ({ ...s, app_challenges: e.target.value }))}
                  placeholder="Describe challenges…"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  <span className="block text-slate-700">कृषिक अॅप किंवा सल्ला सेवेमध्ये कोणत्या सुधारणा सुचवाल?</span>
                  <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Do you have any suggestions for improving the Krushik App or advisory services?</span>
                </label>
                <textarea
                  className={textareaCls()}
                  value={form.app_suggestions}
                  onChange={(e) => setForm((s) => ({ ...s, app_suggestions: e.target.value }))}
                  placeholder="Describe suggestions…"
                />
              </div>
            </div>
          </SectionCard>

          {/* J. Officer Remarks */}
          <SectionCard icon={Shield} title="J. Officer Remarks / क्षेत्रीय अधिकाऱ्यांचे शेरे">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                <span className="block text-slate-700">क्षेत्रीय अधिकाऱ्यांची अतिरिक्त निरीक्षणे / टिप्पण्या</span>
                <span className="block font-normal text-muted-foreground/80 italic mt-0.5">Additional Remarks / Observations by Field Officer</span>
              </label>
              <textarea
                className={textareaCls()}
                value={form.remark}
                onChange={(e) => setForm((s) => ({ ...s, remark: e.target.value }))}
                placeholder="Add any remarks…"
              />
            </div>
          </SectionCard>

          {status.kind !== "idle" && (
            <div className={cn(
              status.kind === "success" && "rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800",
              status.kind === "error" && "rounded-xl border border-destructive/20 bg-destructive/6 p-3.5 text-sm font-medium text-destructive",
              status.kind === "loading" && "rounded-xl border border-border/50 bg-muted/40 p-3.5 text-sm text-muted-foreground",
            )}>{status.message}</div>
          )}

          <Button type="submit" disabled={status.kind === "loading"} className="w-full h-11 rounded-xl font-semibold shadow-sm shadow-primary/20">
            {status.kind === "loading" ? "Submitting…" : "Submit Field Visit Report"}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}
