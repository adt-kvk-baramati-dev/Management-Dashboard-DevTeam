import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthProvider";
import AdminLayout from "@/components/AdminLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { uploadFileToS3, uploadFilesToS3, uploadImagesToS3 } from "@/lib/s3Upload";
import {
  ATTENDED_ROLES,
  CONDUCTED_PROGRAM_TYPES,
  formatDate,
  getOutreachTypeBadgeClass,
  getOutreachTypeLabel,
  getProgramMapUrl,
  OutreachRecord,
  OutreachType,
} from "@/lib/outreach";
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Flag,
  Image as ImageIcon,
  MapPin,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type OutreachMode = "admin" | "employee";

type EmployeeOption = {
  id: string;
  name: string;
  role?: string;
};

type ConductedDraft = {
  programTitle: string;
  programType: (typeof CONDUCTED_PROGRAM_TYPES)[number] | "";
  date: string;
  location: string;
  remarks: string;
  detailedReport: string;
  geoTaggedPhoto: File | null;
  additionalPhotos: File[];
  supportingDocuments: File[];
};

type AttendedDraft = {
  programTitle: string;
  organizer: string;
  role: (typeof ATTENDED_ROLES)[number] | "";
  date: string;
  location: string;
  keyLearning: string;
  remarks: string;
  certificate: File | null;
  geoTaggedPhoto: File | null;
  additionalPhotos: File[];
};

type FormErrors = Record<string, string>;

const textInputCls =
  "h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 transition-colors";

const textareaCls =
  "min-h-[110px] w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 transition-colors";

const selectCls =
  "h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 transition-colors";

const emptyConductedDraft = (today: string): ConductedDraft => ({
  programTitle: "",
  programType: "Training",
  date: today,
  location: "",
  remarks: "",
  detailedReport: "",
  geoTaggedPhoto: null,
  additionalPhotos: [],
  supportingDocuments: [],
});

const emptyAttendedDraft = (today: string): AttendedDraft => ({
  programTitle: "",
  organizer: "",
  role: "Participant",
  date: today,
  location: "",
  keyLearning: "",
  remarks: "",
  certificate: null,
  geoTaggedPhoto: null,
  additionalPhotos: [],
});

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toFileListName(files: File[]) {
  return files.length ? files.map((file) => file.name).join(", ") : "No file selected";
}

function buildMapLink(record: OutreachRecord) {
  return getProgramMapUrl(record);
}

function getFieldError(errors: FormErrors, field: string) {
  return errors[field];
}

function validateGeoPhoto(file: File | null) {
  if (!file) return "A geo-tagged photo is required.";
  return "";
}

function recordOwnsEdit(mode: OutreachMode, requesterId?: string, record?: OutreachRecord | null) {
  if (mode !== "employee") return true;
  if (!requesterId || !record) return false;
  return record.employee_id === requesterId;
}

async function getBrowserGeoLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return null;
  }

  return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      { timeout: 4000, maximumAge: 60_000 },
    );
  });
}

export default function OutreachModule({ mode }: { mode: OutreachMode }) {
  const { token, profile } = useAuth();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "success" | "error"; message?: string }>({ kind: "idle" });
  const [activeListTab, setActiveListTab] = useState<"all" | OutreachType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [programTypeFilter, setProgramTypeFilter] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<OutreachRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<OutreachRecord | null>(null);
  const [createTab, setCreateTab] = useState<OutreachType>("conducted");

  const [conductedDraft, setConductedDraft] = useState<ConductedDraft>(emptyConductedDraft(today));
  const [attendedDraft, setAttendedDraft] = useState<AttendedDraft>(emptyAttendedDraft(today));
  const [conductedErrors, setConductedErrors] = useState<FormErrors>({});
  const [attendedErrors, setAttendedErrors] = useState<FormErrors>({});
  const [conductedAttempted, setConductedAttempted] = useState(false);
  const [attendedAttempted, setAttendedAttempted] = useState(false);
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [editAttempted, setEditAttempted] = useState(false);

  useEffect(() => {
    if (!token) return;
    let mounted = true;

    const loadRecords = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/outreach", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) {
          if (mounted) setError(data?.message || "Failed to load outreach records.");
          return;
        }
        if (mounted) {
          setRecords(Array.isArray(data?.outreach) ? data.outreach : []);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || "Failed to load outreach records.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadRecords();

    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (mode !== "admin" || !token) return;
    let mounted = true;

    const loadEmployees = async () => {
      try {
        const res = await fetch("/api/employees?role=employee", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) return;
        if (mounted) {
          setEmployees(
            Array.isArray(data?.employees)
              ? data.employees.map((employee: any) => ({
                  id: employee.id || employee.employee_id || "",
                  name: employee.name || "Unknown",
                  role: employee.role || "",
                }))
              : [],
          );
        }
      } catch {
        if (mounted) setEmployees([]);
      }
    };

    loadEmployees();

    return () => {
      mounted = false;
    };
  }, [mode, token]);

  useEffect(() => {
    if (selectedRecord || editingRecord) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedRecord, editingRecord]);

  useEffect(() => {
    setConductedDraft(emptyConductedDraft(today));
    setAttendedDraft(emptyAttendedDraft(today));
  }, [today]);

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records.filter((record) => {
      const matchesTab = activeListTab === "all" || record.outreach_type === activeListTab;
      const matchesSearch =
        !q ||
        record.program_title.toLowerCase().includes(q) ||
        record.location.toLowerCase().includes(q) ||
        record.employee_name.toLowerCase().includes(q) ||
        record.remarks?.toLowerCase().includes(q) ||
        record.key_learning?.toLowerCase().includes(q) ||
        record.organizer?.toLowerCase().includes(q) ||
        record.role?.toLowerCase().includes(q);

      const matchesDate = !dateFilter || String(record.date).startsWith(dateFilter);
      const matchesEmployee = !employeeFilter || record.employee_id === employeeFilter || record.employee_name.toLowerCase().includes(employeeFilter.toLowerCase());
      const matchesProgramType = !programTypeFilter || (record.program_type || "").toLowerCase() === programTypeFilter.toLowerCase();

      return matchesTab && matchesSearch && matchesDate && matchesEmployee && matchesProgramType;
    });
  }, [records, activeListTab, searchTerm, dateFilter, employeeFilter, programTypeFilter]);

  const stats = useMemo(() => {
    const base = mode === "employee" && profile?.id ? records.filter((record) => record.employee_id === profile.id) : records;
    return {
      total: base.length,
      conducted: base.filter((record) => record.outreach_type === "conducted").length,
      attended: base.filter((record) => record.outreach_type === "attended").length,
      locations: new Set(base.map((record) => record.location).filter(Boolean)).size,
      documents: base.reduce((sum, record) => sum + (record.supporting_documents?.length || 0), 0),
    };
  }, [mode, profile?.id, records]);

  const resetCreateForms = () => {
    setConductedDraft(emptyConductedDraft(today));
    setAttendedDraft(emptyAttendedDraft(today));
    setConductedErrors({});
    setAttendedErrors({});
    setConductedAttempted(false);
    setAttendedAttempted(false);
  };

  const openCreateMode = () => {
    resetCreateForms();
    setCreateTab("conducted");
  };

  const validateConducted = () => {
    const next: FormErrors = {};
    if (!conductedDraft.programTitle.trim()) next.programTitle = "Program title is required.";
    if (!conductedDraft.programType) next.programType = "Program type is required.";
    if (!conductedDraft.date) next.date = "Date is required.";
    if (!conductedDraft.location.trim()) next.location = "Location is required.";
    if (!conductedDraft.geoTaggedPhoto) next.geoTaggedPhoto = validateGeoPhoto(conductedDraft.geoTaggedPhoto);
    if (conductedDraft.additionalPhotos.length > 3) next.additionalPhotos = "Maximum 3 additional photos allowed.";
    return next;
  };

  const validateAttended = () => {
    const next: FormErrors = {};
    if (!attendedDraft.programTitle.trim()) next.programTitle = "Program title is required.";
    if (!attendedDraft.organizer.trim()) next.organizer = "Organizer is required.";
    if (!attendedDraft.role) next.role = "Role is required.";
    if (!attendedDraft.date) next.date = "Date is required.";
    if (!attendedDraft.location.trim()) next.location = "Location is required.";
    if (!attendedDraft.geoTaggedPhoto) next.geoTaggedPhoto = validateGeoPhoto(attendedDraft.geoTaggedPhoto);
    if (attendedDraft.additionalPhotos.length > 3) next.additionalPhotos = "Maximum 3 additional photos allowed.";
    return next;
  };

  const validateEdit = (record: OutreachRecord) => {
    const next: FormErrors = {};
    if (!record.program_title.trim()) next.program_title = "Program title is required.";
    if (!record.location.trim()) next.location = "Location is required.";
    if (!record.date) next.date = "Date is required.";
    if (!record.geo_tagged_photo) next.geo_tagged_photo = "A geo-tagged photo is required.";
    if (record.outreach_type === "conducted" && !record.program_type) next.program_type = "Program type is required.";
    if (record.outreach_type === "attended") {
      if (!record.organizer?.trim()) next.organizer = "Organizer is required.";
      if (!record.role) next.role = "Role is required.";
    }
    return next;
  };

  const submitConducted = async (event: React.FormEvent) => {
    event.preventDefault();
    setConductedAttempted(true);
    const validationErrors = validateConducted();
    setConductedErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      setStatus({ kind: "error", message: "Please fix the highlighted fields." });
      return;
    }

    if (!token || !profile?.id || !profile?.name) {
      setStatus({ kind: "error", message: "Session expired. Please sign in again." });
      return;
    }

    try {
      setStatus({ kind: "loading", message: "Uploading files..." });
      const geoLocation = await getBrowserGeoLocation();
      const [geoTaggedPhoto, additionalPhotos, supportingDocuments] = await Promise.all([
        uploadFileToS3({ file: conductedDraft.geoTaggedPhoto as File, token, purpose: "outreach" }),
        uploadImagesToS3({ files: conductedDraft.additionalPhotos.slice(0, 3), token, purpose: "outreach" }),
        uploadFilesToS3({ files: conductedDraft.supportingDocuments, token, purpose: "outreach" }),
      ]);

      setStatus({ kind: "loading", message: "Saving conducted program..." });
      const payload = {
        outreach_type: "conducted",
        program_title: conductedDraft.programTitle.trim(),
        program_type: conductedDraft.programType,
        date: conductedDraft.date,
        location: conductedDraft.location.trim(),
        remarks: conductedDraft.remarks.trim(),
        detailed_report: conductedDraft.detailedReport.trim(),
        geo_tagged_photo: geoTaggedPhoto,
        additional_program_photos: additionalPhotos,
        supporting_documents: supportingDocuments.map((url, index) => ({ name: conductedDraft.supportingDocuments[index]?.name || `Document ${index + 1}`, url })),
        geo_latitude: geoLocation?.latitude ?? null,
        geo_longitude: geoLocation?.longitude ?? null,
        geo_location_label: conductedDraft.location.trim(),
        employee_id: profile.id,
        employee_name: profile.name,
      };

      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: body?.message || "Failed to create conducted program." });
        return;
      }

      setRecords((current) => [body.outreach, ...current]);
      resetCreateForms();
      setStatus({ kind: "success", message: "Conducted program created successfully." });
    } catch (err: any) {
      setStatus({ kind: "error", message: err?.message || "Failed to create conducted program." });
    }
  };

  const submitAttended = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttendedAttempted(true);
    const validationErrors = validateAttended();
    setAttendedErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      setStatus({ kind: "error", message: "Please fix the highlighted fields." });
      return;
    }

    if (!token || !profile?.id || !profile?.name) {
      setStatus({ kind: "error", message: "Session expired. Please sign in again." });
      return;
    }

    try {
      setStatus({ kind: "loading", message: "Uploading files..." });
      const geoLocation = await getBrowserGeoLocation();
      const [geoTaggedPhoto, additionalPhotos, certificateUrl] = await Promise.all([
        uploadFileToS3({ file: attendedDraft.geoTaggedPhoto as File, token, purpose: "outreach" }),
        uploadImagesToS3({ files: attendedDraft.additionalPhotos.slice(0, 3), token, purpose: "outreach" }),
        attendedDraft.certificate ? uploadFileToS3({ file: attendedDraft.certificate, token, purpose: "outreach", allowNonImage: true }) : Promise.resolve(""),
      ]);

      setStatus({ kind: "loading", message: "Saving attended program..." });
      const payload = {
        outreach_type: "attended",
        program_title: attendedDraft.programTitle.trim(),
        organizer: attendedDraft.organizer.trim(),
        role: attendedDraft.role,
        date: attendedDraft.date,
        location: attendedDraft.location.trim(),
        key_learning: attendedDraft.keyLearning.trim(),
        remarks: attendedDraft.remarks.trim(),
        certificate: certificateUrl,
        geo_tagged_photo: geoTaggedPhoto,
        additional_program_photos: additionalPhotos,
        geo_latitude: geoLocation?.latitude ?? null,
        geo_longitude: geoLocation?.longitude ?? null,
        geo_location_label: attendedDraft.location.trim(),
        employee_id: profile.id,
        employee_name: profile.name,
      };

      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: body?.message || "Failed to create attended program." });
        return;
      }

      setRecords((current) => [body.outreach, ...current]);
      resetCreateForms();
      setStatus({ kind: "success", message: "Attended program created successfully." });
    } catch (err: any) {
      setStatus({ kind: "error", message: err?.message || "Failed to create attended program." });
    }
  };

  const removeRecord = async (record: OutreachRecord) => {
    if (!token) return;
    if (!window.confirm(`Delete ${record.program_title}?`)) return;
    try {
      const res = await fetch(`/api/outreach/${record.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: body?.message || "Unable to delete record." });
        return;
      }
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setStatus({ kind: "success", message: body?.message || "Outreach record deleted." });
    } catch (err: any) {
      setStatus({ kind: "error", message: err?.message || "Unable to delete record." });
    }
  };

  const startEdit = (record: OutreachRecord) => {
    setEditErrors({});
    setEditAttempted(false);
    setEditingRecord({ ...record });
  };

  const saveEdit = async () => {
    if (!token || !editingRecord) return;
    setEditAttempted(true);
    const validationErrors = validateEdit(editingRecord);
    setEditErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      setStatus({ kind: "error", message: "Please fix the highlighted fields." });
      return;
    }

    try {
      setStatus({ kind: "loading", message: "Saving changes..." });
      const payload = {
        outreach_type: editingRecord.outreach_type,
        program_title: editingRecord.program_title.trim(),
        program_type: editingRecord.program_type,
        organizer: editingRecord.organizer,
        role: editingRecord.role,
        date: editingRecord.date,
        location: editingRecord.location.trim(),
        remarks: editingRecord.remarks || "",
        key_learning: editingRecord.key_learning || "",
        detailed_report: editingRecord.detailed_report || "",
        certificate: editingRecord.certificate || "",
        geo_tagged_photo: editingRecord.geo_tagged_photo || "",
        additional_program_photos: editingRecord.additional_program_photos || [],
        supporting_documents: editingRecord.supporting_documents || [],
        geo_latitude: editingRecord.geo_latitude ?? null,
        geo_longitude: editingRecord.geo_longitude ?? null,
        geo_location_label: editingRecord.geo_location_label || editingRecord.location,
      };

      const res = await fetch(`/api/outreach/${editingRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: body?.message || "Failed to update record." });
        return;
      }

      setRecords((current) => current.map((record) => (record.id === editingRecord.id ? body.outreach : record)));
      setEditingRecord(null);
      setStatus({ kind: "success", message: "Outreach record updated successfully." });
    } catch (err: any) {
      setStatus({ kind: "error", message: err?.message || "Failed to update record." });
    }
  };

  const exportFilteredCsv = () => {
    const rows = filteredRecords.map((record) => ({
      Type: getOutreachTypeLabel(record.outreach_type),
      Title: record.program_title,
      Date: record.date,
      Location: record.location,
      Employee: record.employee_name,
      ProgramType: record.program_type || "",
      Organizer: record.organizer || "",
      Role: record.role || "",
      Remarks: record.remarks || "",
      KeyLearning: record.key_learning || "",
      Documents: record.supporting_documents?.length || 0,
      Photos: 1 + (record.additional_program_photos?.length || 0),
    }));

    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const lines = [keys.join(",")].concat(rows.map((row) => keys.map((key) => csvEscape((row as any)[key])).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Outreach_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const selectedMapLink = selectedRecord ? buildMapLink(selectedRecord) : "";
  const editingMapLink = editingRecord ? buildMapLink(editingRecord) : "";
  const canEditSelected = recordOwnsEdit(mode, profile?.id, selectedRecord);
  const canEditEditing = recordOwnsEdit(mode, profile?.id, editingRecord);

  return (
    <AdminLayout title={mode === "admin" ? "Outreach Programs" : "Outreach Programs"}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary/70">Outreach</p>
            <h1 className="text-2xl font-headline font-bold text-on-surface">
              {mode === "admin" ? "Outreach Programs" : "My Outreach Records"}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {mode === "admin"
                ? "Review conducted and attended programs across the field teams."
                : "Create, review, edit, and manage your own outreach records."}
            </p>
          </div>
          {mode === "employee" ? (
            <Link
              to="/employee/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
            >
              <ArrowLeftIcon /> Back
            </Link>
          ) : (
            <Button variant="outline" onClick={exportFilteredCsv} disabled={!filteredRecords.length} className="gap-2">
              <Download className="h-4 w-4" /> Download Report
            </Button>
          )}
        </div>

        {error && (
          <Alert className="border border-destructive/30 bg-destructive/10">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}

        {status.kind !== "idle" && (
          <Alert
            className={cn(
              status.kind === "success" && "border-emerald-300 bg-emerald-50",
              status.kind === "error" && "border-destructive/30 bg-destructive/10",
              status.kind === "loading" && "border-outline-variant/30 bg-surface-container-low",
            )}
          >
            <AlertDescription className={status.kind === "error" ? "text-destructive" : "text-on-surface"}>
              {status.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-semibold uppercase text-on-surface-variant">
                Total Records <Calendar className="h-5 w-5 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-on-surface">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-semibold uppercase text-on-surface-variant">
                Conducted <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-on-surface">{stats.conducted}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-semibold uppercase text-on-surface-variant">
                Attended <Building2 className="h-5 w-5 text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-on-surface">{stats.attended}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-semibold uppercase text-on-surface-variant">
                Geo / Docs <Camera className="h-5 w-5 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-on-surface">{stats.documents}</p>
              <p className="text-xs text-on-surface-variant mt-1">Uploaded supporting documents</p>
            </CardContent>
          </Card>
        </div>

        {mode === "employee" && (
          <Card className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
            <CardHeader className="space-y-2 border-b border-outline-variant/20 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-semibold text-on-surface">Create Outreach Record</CardTitle>
                  <p className="text-sm text-on-surface-variant">Submit conducted or attended programs with photos and documents.</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={openCreateMode}>
                  <Plus className="h-4 w-4" /> Reset Form
                </Button>
              </div>
              <Tabs value={createTab} onValueChange={(value) => setCreateTab(value as OutreachType)}>
                <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl bg-surface-container-low">
                  <TabsTrigger value="conducted">Conducted</TabsTrigger>
                  <TabsTrigger value="attended">Attended</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Tabs value={createTab} onValueChange={(value) => setCreateTab(value as OutreachType)}>
                <TabsContent value="conducted" className="m-0">
                  <form className="space-y-6" onSubmit={submitConducted}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Program Title</label>
                        <Input className={textInputCls} value={conductedDraft.programTitle} onChange={(e) => setConductedDraft((current) => ({ ...current, programTitle: e.target.value }))} />
                        {conductedAttempted && getFieldError(conductedErrors, "programTitle") && <p className="mt-1 text-xs text-destructive">{conductedErrors.programTitle}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Program Type</label>
                        <select className={selectCls} value={conductedDraft.programType} onChange={(e) => setConductedDraft((current) => ({ ...current, programType: e.target.value as ConductedDraft["programType"] }))}>
                          {CONDUCTED_PROGRAM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                        {conductedAttempted && getFieldError(conductedErrors, "programType") && <p className="mt-1 text-xs text-destructive">{conductedErrors.programType}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Date</label>
                        <Input type="date" className={textInputCls} value={conductedDraft.date} onChange={(e) => setConductedDraft((current) => ({ ...current, date: e.target.value }))} />
                        {conductedAttempted && getFieldError(conductedErrors, "date") && <p className="mt-1 text-xs text-destructive">{conductedErrors.date}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Location</label>
                        <Input className={textInputCls} value={conductedDraft.location} onChange={(e) => setConductedDraft((current) => ({ ...current, location: e.target.value }))} />
                        {conductedAttempted && getFieldError(conductedErrors, "location") && <p className="mt-1 text-xs text-destructive">{conductedErrors.location}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Remarks / Key Topics</label>
                      <Textarea className={textareaCls} value={conductedDraft.remarks} onChange={(e) => setConductedDraft((current) => ({ ...current, remarks: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Detailed Report</label>
                      <Textarea className={textareaCls} value={conductedDraft.detailedReport} onChange={(e) => setConductedDraft((current) => ({ ...current, detailedReport: e.target.value }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Geo-tagged Photo</label>
                        <Input type="file" accept="image/*" className={textInputCls} onChange={(e) => setConductedDraft((current) => ({ ...current, geoTaggedPhoto: e.target.files?.[0] || null }))} />
                        {conductedDraft.geoTaggedPhoto && <p className="mt-1 text-xs text-on-surface-variant">{conductedDraft.geoTaggedPhoto.name}</p>}
                        {conductedAttempted && getFieldError(conductedErrors, "geoTaggedPhoto") && <p className="mt-1 text-xs text-destructive">{conductedErrors.geoTaggedPhoto}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Additional Program Photos (max 3)</label>
                        <Input type="file" accept="image/*" multiple className={textInputCls} onChange={(e) => setConductedDraft((current) => ({ ...current, additionalPhotos: Array.from(e.target.files || []).slice(0, 3) }))} />
                        <p className="mt-1 text-xs text-on-surface-variant">{toFileListName(conductedDraft.additionalPhotos)}</p>
                        {conductedAttempted && getFieldError(conductedErrors, "additionalPhotos") && <p className="mt-1 text-xs text-destructive">{conductedErrors.additionalPhotos}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Supporting Documents</label>
                      <Input type="file" multiple className={textInputCls} onChange={(e) => setConductedDraft((current) => ({ ...current, supportingDocuments: Array.from(e.target.files || []) }))} />
                      <p className="mt-1 text-xs text-on-surface-variant">{toFileListName(conductedDraft.supportingDocuments)}</p>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button type="submit" className="gap-2">
                        <Upload className="h-4 w-4" /> Submit Conducted Program
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="attended" className="m-0">
                  <form className="space-y-6" onSubmit={submitAttended}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Program Title</label>
                        <Input className={textInputCls} value={attendedDraft.programTitle} onChange={(e) => setAttendedDraft((current) => ({ ...current, programTitle: e.target.value }))} />
                        {attendedAttempted && getFieldError(attendedErrors, "programTitle") && <p className="mt-1 text-xs text-destructive">{attendedErrors.programTitle}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Organizer</label>
                        <Input className={textInputCls} value={attendedDraft.organizer} onChange={(e) => setAttendedDraft((current) => ({ ...current, organizer: e.target.value }))} />
                        {attendedAttempted && getFieldError(attendedErrors, "organizer") && <p className="mt-1 text-xs text-destructive">{attendedErrors.organizer}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Date</label>
                        <Input type="date" className={textInputCls} value={attendedDraft.date} onChange={(e) => setAttendedDraft((current) => ({ ...current, date: e.target.value }))} />
                        {attendedAttempted && getFieldError(attendedErrors, "date") && <p className="mt-1 text-xs text-destructive">{attendedErrors.date}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Location</label>
                        <Input className={textInputCls} value={attendedDraft.location} onChange={(e) => setAttendedDraft((current) => ({ ...current, location: e.target.value }))} />
                        {attendedAttempted && getFieldError(attendedErrors, "location") && <p className="mt-1 text-xs text-destructive">{attendedErrors.location}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Role</label>
                        <select className={selectCls} value={attendedDraft.role} onChange={(e) => setAttendedDraft((current) => ({ ...current, role: e.target.value as AttendedDraft["role"] }))}>
                          {ATTENDED_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                        {attendedAttempted && getFieldError(attendedErrors, "role") && <p className="mt-1 text-xs text-destructive">{attendedErrors.role}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Key Learning</label>
                      <Textarea className={textareaCls} value={attendedDraft.keyLearning} onChange={(e) => setAttendedDraft((current) => ({ ...current, keyLearning: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Remarks</label>
                      <Textarea className={textareaCls} value={attendedDraft.remarks} onChange={(e) => setAttendedDraft((current) => ({ ...current, remarks: e.target.value }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Certificate (Optional)</label>
                        <Input type="file" className={textInputCls} onChange={(e) => setAttendedDraft((current) => ({ ...current, certificate: e.target.files?.[0] || null }))} />
                        <p className="mt-1 text-xs text-on-surface-variant">{attendedDraft.certificate?.name || "No file selected"}</p>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Geo-tagged Photo</label>
                        <Input type="file" accept="image/*" className={textInputCls} onChange={(e) => setAttendedDraft((current) => ({ ...current, geoTaggedPhoto: e.target.files?.[0] || null }))} />
                        <p className="mt-1 text-xs text-on-surface-variant">{attendedDraft.geoTaggedPhoto?.name || "No file selected"}</p>
                        {attendedAttempted && getFieldError(attendedErrors, "geoTaggedPhoto") && <p className="mt-1 text-xs text-destructive">{attendedErrors.geoTaggedPhoto}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Additional Program Photos (max 3)</label>
                      <Input type="file" accept="image/*" multiple className={textInputCls} onChange={(e) => setAttendedDraft((current) => ({ ...current, additionalPhotos: Array.from(e.target.files || []).slice(0, 3) }))} />
                      <p className="mt-1 text-xs text-on-surface-variant">{toFileListName(attendedDraft.additionalPhotos)}</p>
                      {attendedAttempted && getFieldError(attendedErrors, "additionalPhotos") && <p className="mt-1 text-xs text-destructive">{attendedErrors.additionalPhotos}</p>}
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button type="submit" className="gap-2">
                        <Upload className="h-4 w-4" /> Submit Attended Program
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {mode === "admin" && (
          <Card className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
            <CardHeader className="space-y-4 border-b border-outline-variant/20 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-semibold text-on-surface">Filters & Report</CardTitle>
                  <p className="text-sm text-on-surface-variant">Filter by employee, date, program type, outreach type and search title.</p>
                </div>
                <Button variant="outline" onClick={exportFilteredCsv} className="gap-2">
                  <Download className="h-4 w-4" /> Download Report
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="relative xl:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/60" />
                  <Input className={cn(textInputCls, "pl-10")} placeholder="Search by program title, remarks, location or employee" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Input type="date" className={textInputCls} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                <select className={selectCls} value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
                  <option value="">All Employees</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.name}</option>
                  ))}
                </select>
                <select className={selectCls} value={programTypeFilter} onChange={(e) => setProgramTypeFilter(e.target.value)}>
                  <option value="">All Program Types</option>
                  {CONDUCTED_PROGRAM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <Tabs value={activeListTab} onValueChange={(value) => setActiveListTab(value as "all" | OutreachType)}>
                <TabsList className="grid w-full max-w-lg grid-cols-3 rounded-2xl bg-surface-container-low">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="conducted">Conducted</TabsTrigger>
                  <TabsTrigger value="attended">Attended</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-hidden rounded-2xl border border-outline-variant/20">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-container-low text-left text-xs uppercase tracking-wide text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3">Program</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-on-surface-variant">Loading outreach records...</td>
                      </tr>
                    ) : filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-on-surface-variant">No outreach records found.</td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-primary/5">
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <p className="font-semibold text-on-surface">{record.program_title}</p>
                              <p className="text-xs text-on-surface-variant line-clamp-1">{record.remarks || record.key_learning || record.detailed_report || "No remarks"}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getOutreachTypeBadgeClass(record.outreach_type))}>
                              {getOutreachTypeLabel(record.outreach_type)}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-on-surface">{record.employee_name}</p>
                            <p className="text-xs text-on-surface-variant">{record.employee_id}</p>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">{formatDate(record.date)}</td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-on-surface">{record.location}</p>
                            {record.geo_latitude != null && record.geo_longitude != null && <p className="text-xs text-on-surface-variant">Geo available</p>}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => setSelectedRecord(record)}>
                                <Eye className="h-4 w-4" /> View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "employee" && (
          <Card className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
            <CardHeader className="space-y-4 border-b border-outline-variant/20 pb-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-on-surface">My Outreach Records</CardTitle>
                  <p className="text-sm text-on-surface-variant">Review, update, delete, and view your submitted outreach entries.</p>
                </div>
                <Button variant="outline" onClick={exportFilteredCsv} className="gap-2 self-start md:self-auto">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative xl:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/60" />
                  <Input className={cn(textInputCls, "pl-10")} placeholder="Search your records" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Input type="date" className={textInputCls} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                <select className={selectCls} value={createTab} onChange={(e) => setCreateTab(e.target.value as OutreachType)}>
                  <option value="conducted">Show Conducted Form</option>
                  <option value="attended">Show Attended Form</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-hidden rounded-2xl border border-outline-variant/20">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-container-low text-left text-xs uppercase tracking-wide text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3">Program</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-on-surface-variant">Loading your outreach records...</td>
                      </tr>
                    ) : filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-on-surface-variant">No outreach records yet.</td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-primary/5">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-on-surface">{record.program_title}</p>
                            <p className="text-xs text-on-surface-variant line-clamp-1">{record.remarks || record.key_learning || record.detailed_report || "No remarks"}</p>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getOutreachTypeBadgeClass(record.outreach_type))}>
                              {getOutreachTypeLabel(record.outreach_type)}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">{formatDate(record.date)}</td>
                          <td className="px-4 py-4">{record.location}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => setSelectedRecord(record)}>
                                <Eye className="h-4 w-4" /> View
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => startEdit(record)} disabled={!recordOwnsEdit(mode, profile?.id, record)}>
                                <Edit className="h-4 w-4" /> Edit
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => removeRecord(record)} disabled={!recordOwnsEdit(mode, profile?.id, record)}>
                                <Trash2 className="h-4 w-4" /> Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-outline-variant/20 px-6 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">Outreach Details</p>
                  <h2 className="text-lg font-bold text-on-surface">{selectedRecord.program_title}</h2>
                </div>
                <button type="button" onClick={() => setSelectedRecord(null)} className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-6 overflow-y-auto p-6 lg:grid-cols-[1.35fr_0.9fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="rounded-2xl border border-outline-variant/20">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Type</p>
                        <Badge className={cn("mt-2 rounded-full px-2.5 py-1 text-xs font-medium", getOutreachTypeBadgeClass(selectedRecord.outreach_type))}>
                          {getOutreachTypeLabel(selectedRecord.outreach_type)}
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border border-outline-variant/20">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Employee</p>
                        <p className="mt-2 text-sm font-medium text-on-surface">{selectedRecord.employee_name}</p>
                        <p className="text-xs text-on-surface-variant">{selectedRecord.employee_id}</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border border-outline-variant/20">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Date</p>
                        <p className="mt-2 text-sm font-medium text-on-surface">{formatDate(selectedRecord.date)}</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border border-outline-variant/20">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Location</p>
                        <p className="mt-2 text-sm font-medium text-on-surface">{selectedRecord.location}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-2xl border border-outline-variant/20">
                    <CardContent className="space-y-4 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Remarks</p>
                        <p className="mt-1 text-sm text-on-surface">{selectedRecord.remarks || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Detailed Report</p>
                        <p className="mt-1 whitespace-pre-line text-sm text-on-surface">{selectedRecord.detailed_report || "-"}</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Program Type</p>
                          <p className="mt-1 text-sm text-on-surface">{selectedRecord.program_type || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Organizer / Role</p>
                          <p className="mt-1 text-sm text-on-surface">{selectedRecord.organizer || selectedRecord.role || "-"}</p>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Key Learning</p>
                          <p className="mt-1 text-sm text-on-surface">{selectedRecord.key_learning || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Certificate</p>
                          {selectedRecord.certificate ? (
                            <Button variant="outline" size="sm" className="mt-1 gap-2" onClick={() => window.open(selectedRecord.certificate, "_blank")}>Open Certificate</Button>
                          ) : (
                            <p className="mt-1 text-sm text-on-surface-variant">Not provided</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border border-outline-variant/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-on-surface">Supporting Documents</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {selectedRecord.supporting_documents?.length ? (
                          selectedRecord.supporting_documents.map((document, index) => (
                            <button key={`${document.url}-${index}`} type="button" className="flex w-full items-center justify-between rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-left text-sm transition-colors hover:border-primary/40" onClick={() => window.open(document.url, "_blank")}>
                              <span className="truncate">{document.name}</span>
                              <span className="text-xs text-on-surface-variant">Open</span>
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-on-surface-variant">No documents uploaded.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card className="rounded-2xl border border-outline-variant/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-on-surface">Geo Location</p>
                        {selectedMapLink && (
                          <Button variant="outline" size="sm" onClick={() => window.open(selectedMapLink, "_blank")}>Open Map</Button>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-on-surface-variant">{selectedRecord.geo_location_label || selectedRecord.location}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {selectedRecord.geo_latitude != null && selectedRecord.geo_longitude != null
                          ? `${selectedRecord.geo_latitude}, ${selectedRecord.geo_longitude}`
                          : "Map opens by location search when coordinates are unavailable."}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border border-outline-variant/20">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-on-surface">Photos</p>
                      </div>
                      {selectedRecord.geo_tagged_photo ? (
                        <button type="button" className="overflow-hidden rounded-2xl border border-outline-variant/20" onClick={() => window.open(selectedRecord.geo_tagged_photo, "_blank")}>
                          <img src={selectedRecord.geo_tagged_photo} alt="Geo-tagged" className="h-48 w-full object-cover" />
                        </button>
                      ) : (
                        <p className="text-sm text-on-surface-variant">No geo-tagged photo.</p>
                      )}
                      {selectedRecord.additional_program_photos?.length ? (
                        <div className="grid grid-cols-2 gap-3">
                          {selectedRecord.additional_program_photos.map((photo, index) => (
                            <button key={`${photo}-${index}`} type="button" className="overflow-hidden rounded-2xl border border-outline-variant/20" onClick={() => window.open(photo, "_blank")}> 
                              <img src={photo} alt={`Additional ${index + 1}`} className="h-28 w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-on-surface-variant">No additional photos.</p>
                      )}
                    </CardContent>
                  </Card>

                  {(mode === "employee" || canEditSelected) && (
                    <div className="flex gap-3">
                      {mode === "employee" && canEditSelected && (
                        <Button className="flex-1 gap-2" onClick={() => startEdit(selectedRecord)}>
                          <Edit className="h-4 w-4" /> Edit
                        </Button>
                      )}
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => setSelectedRecord(null)}>
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingRecord && canEditEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-outline-variant/20 px-6 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">Edit Outreach Record</p>
                  <h2 className="text-lg font-bold text-on-surface">{editingRecord.program_title}</h2>
                </div>
                <button type="button" onClick={() => setEditingRecord(null)} className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Program Title</label>
                    <Input className={textInputCls} value={editingRecord.program_title} onChange={(e) => setEditingRecord((current) => current ? { ...current, program_title: e.target.value } : current)} />
                    {editAttempted && editErrors.program_title && <p className="mt-1 text-xs text-destructive">{editErrors.program_title}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Location</label>
                    <Input className={textInputCls} value={editingRecord.location} onChange={(e) => setEditingRecord((current) => current ? { ...current, location: e.target.value } : current)} />
                    {editAttempted && editErrors.location && <p className="mt-1 text-xs text-destructive">{editErrors.location}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Date</label>
                    <Input type="date" className={textInputCls} value={editingRecord.date} onChange={(e) => setEditingRecord((current) => current ? { ...current, date: e.target.value } : current)} />
                    {editAttempted && editErrors.date && <p className="mt-1 text-xs text-destructive">{editErrors.date}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Outreach Type</label>
                    <select className={selectCls} value={editingRecord.outreach_type} onChange={(e) => setEditingRecord((current) => current ? { ...current, outreach_type: e.target.value as OutreachType } : current)}>
                      <option value="conducted">Conducted</option>
                      <option value="attended">Attended</option>
                    </select>
                  </div>
                </div>

                {editingRecord.outreach_type === "conducted" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Program Type</label>
                      <select className={selectCls} value={editingRecord.program_type || ""} onChange={(e) => setEditingRecord((current) => current ? { ...current, program_type: e.target.value as any } : current)}>
                        <option value="">Select Program Type</option>
                        {CONDUCTED_PROGRAM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                      {editAttempted && editErrors.program_type && <p className="mt-1 text-xs text-destructive">{editErrors.program_type}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Remarks</label>
                      <Input className={textInputCls} value={editingRecord.remarks || ""} onChange={(e) => setEditingRecord((current) => current ? { ...current, remarks: e.target.value } : current)} />
                    </div>
                  </div>
                )}

                {editingRecord.outreach_type === "attended" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Organizer</label>
                      <Input className={textInputCls} value={editingRecord.organizer || ""} onChange={(e) => setEditingRecord((current) => current ? { ...current, organizer: e.target.value } : current)} />
                      {editAttempted && editErrors.organizer && <p className="mt-1 text-xs text-destructive">{editErrors.organizer}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Role</label>
                      <select className={selectCls} value={editingRecord.role || ""} onChange={(e) => setEditingRecord((current) => current ? { ...current, role: e.target.value as any } : current)}>
                        <option value="">Select Role</option>
                        {ATTENDED_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                      {editAttempted && editErrors.role && <p className="mt-1 text-xs text-destructive">{editErrors.role}</p>}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Geo-tagged Photo URL</label>
                    <Input className={textInputCls} value={editingRecord.geo_tagged_photo || ""} onChange={(e) => setEditingRecord((current) => current ? { ...current, geo_tagged_photo: e.target.value } : current)} />
                    {editAttempted && editErrors.geo_tagged_photo && <p className="mt-1 text-xs text-destructive">{editErrors.geo_tagged_photo}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Map Label</label>
                    <Input className={textInputCls} value={editingRecord.geo_location_label || ""} onChange={(e) => setEditingRecord((current) => current ? { ...current, geo_location_label: e.target.value } : current)} />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Supporting Document URLs</label>
                    <Textarea className={textareaCls} value={(editingRecord.supporting_documents || []).map((document) => document.url).join("\n")} onChange={(e) => setEditingRecord((current) => current ? { ...current, supporting_documents: e.target.value.split("\n").filter(Boolean).map((url) => ({ name: url.split("/").pop() || "Document", url })) } : current)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Additional Photo URLs</label>
                    <Textarea className={textareaCls} value={(editingRecord.additional_program_photos || []).join("\n")} onChange={(e) => setEditingRecord((current) => current ? { ...current, additional_program_photos: e.target.value.split("\n").filter(Boolean) } : current)} />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-3">
                    {editingMapLink && (
                      <Button variant="outline" onClick={() => window.open(editingMapLink, "_blank")} className="gap-2">
                        <MapPin className="h-4 w-4" /> Open Map
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>
                    <Button onClick={saveEdit} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

function ArrowLeftIcon() {
  return <span className="text-base leading-none">←</span>;
}