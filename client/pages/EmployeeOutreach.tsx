import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, CheckCircle2, MapPin, Calendar, Camera, Upload, Clock, X } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import AdminLayout from "../components/AdminLayout";
import { cn } from "@/lib/utils";
import { uploadImagesToS3 } from "@/lib/s3Upload";

interface OutreachRecord {
  id?: string;
  employee_id: string;
  employee_name: string;
  section_type: "conducted" | "attended";
  location: string;
  date: string;
  duration?: number;
  photos?: string[];
  collaborator?: string;
  agronomist_specialist?: string;
  no_of_people?: number;
  instructor?: string;
  invited_employee_ids?: string[];
  invited_employee_names?: string[];
  created_at?: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  role: string;
}

const COLLABORATOR_OPTIONS = [
  { value: "kvk_scientist", label: "KVK Scientist" },
  { value: "subject_matter_specialist", label: "Subject Matter Specialist" },
  { value: "agronomist", label: "Agronomist" },
  { value: "extension_officer", label: "Extension Officer" },
  { value: "fpo_farmer_group", label: "FPO / Farmer Group" },
  { value: "ngo_partner", label: "NGO Partner" },
  { value: "other", label: "Other" },
];

const inputCls = (hasError?: boolean) =>
  cn(
    "h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 disabled:opacity-60 transition-colors",
    hasError && "border-destructive/50 focus:ring-destructive/12"
  );

const selectCls = (hasError?: boolean) =>
  cn(
    "h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 disabled:opacity-60 transition-colors",
    hasError && "border-destructive/50 focus:ring-destructive/12"
  );

const toggleInvitee = (existingIds: string[], id: string): string[] => {
  return existingIds.includes(id)
    ? existingIds.filter((item) => item !== id)
    : [...existingIds, id];
};

export default function EmployeeOutreach() {
  const { token, profile } = useAuth();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [activeTab, setActiveTab] = useState<"conducted" | "attended">("conducted");

  const [conducted, setConducted] = useState({
    location: "",
    date: today,
    collaborator: "",
    no_of_people: "",
    duration: "",
    photos: [] as File[],
    invited_employee_ids: [] as string[],
  });
  
  const [attended, setAttended] = useState({
    location: "",
    date: today,
    instructor: "",
    duration: "",
    photos: [] as File[],
    invited_employee_ids: [] as string[],
  });

  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [conductedInviteQuery, setConductedInviteQuery] = useState("");
  const [attendedInviteQuery, setAttendedInviteQuery] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "success" | "error"; message?: string }>({ kind: "idle" });

  const [conductedSubmitAttempted, setConductedSubmitAttempted] = useState(false);
  const [conductedErrors, setConductedErrors] = useState<Record<string, string>>({});
  const [attendedSubmitAttempted, setAttendedSubmitAttempted] = useState(false);
  const [attendedErrors, setAttendedErrors] = useState<Record<string, string>>({});

  const filterInvitees = (query: string, selectedIds: string[]) => {
    const normalized = query.trim().toLowerCase();
    return employees.filter((employee) => {
      if (selectedIds.includes(employee.id)) return false;
      if (!normalized) return true;
      return (
        employee.name.toLowerCase().includes(normalized) ||
        employee.role.toLowerCase().includes(normalized) ||
        employee.id.toLowerCase().includes(normalized)
      );
    });
  };

  const filteredConductedInvitees = useMemo(() => {
    return filterInvitees(conductedInviteQuery, conducted.invited_employee_ids).slice(0, 8);
  }, [conductedInviteQuery, conducted.invited_employee_ids, employees]);

  const filteredAttendedInvitees = useMemo(() => {
    return filterInvitees(attendedInviteQuery, attended.invited_employee_ids).slice(0, 8);
  }, [attendedInviteQuery, attended.invited_employee_ids, employees]);

  const validateConducted = () => {
    const next: Record<string, string> = {};
    if (!conducted.location.trim()) next.location = "Location is required.";
    if (!conducted.date) next.date = "Date is required.";
    if (!conducted.collaborator) next.collaborator = "Collaborator is required.";
    if (!conducted.no_of_people) next.no_of_people = "Number of people is required.";
    else if (Number(conducted.no_of_people) <= 0 || Number.isNaN(Number(conducted.no_of_people))) {
      next.no_of_people = "Enter a valid number.";
    }
    // Photo required check
    if (conducted.photos.length === 0) {
      next.photos = "At least one photo is required.";
    }
    return next;
  };

  const validateAttended = () => {
    const next: Record<string, string> = {};
    if (!attended.location.trim()) next.location = "Location is required.";
    if (!attended.date) next.date = "Date is required.";
    if (!attended.instructor.trim()) next.instructor = "Instructor is required.";
    // Photo required check
    if (attended.photos.length === 0) {
      next.photos = "At least one photo is required.";
    }
    return next;
  };

  const handleConductedPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setConducted((s) => ({ ...s, photos: Array.from(files) }));
  };

  const handleAttendedPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setAttended((s) => ({ ...s, photos: Array.from(files) }));
  };

  useEffect(() => {
    if (!token || !profile?.id) return;
    let isMounted = true;
    
    (async () => {
      try {
        setStatus({ kind: "loading" });
        const res = await fetch(`/api/outreach/employee/${profile.id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          if (isMounted) setStatus({ kind: "error", message: "Failed to load outreach records" });
          return;
        }
        const data = await res.json();
        if (isMounted) {
          setRecords(data.outreach || []);
          setStatus({ kind: "idle" });
        }
      } catch (error: any) {
        if (isMounted) setStatus({ kind: "error", message: error?.message || "Failed to load records" });
      }
    })();

    return () => { isMounted = false; };
  }, [token, profile?.id]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    (async () => {
      try {
        const res = await fetch("/api/employees?role=employee", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        const list = Array.isArray(data?.employees) ? data.employees : [];
        if (isMounted) {
          setEmployees(
            list
              .filter((emp: EmployeeOption) => emp.id && emp.id !== profile?.id)
              .map((emp: EmployeeOption) => ({ id: emp.id, name: emp.name, role: emp.role }))
          );
        }
      } catch {
        if (isMounted) setEmployees([]);
      }
    })();

    return () => { isMounted = false; };
  }, [token, profile?.id]);

  const handleSubmitConducted = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !profile?.id || !profile?.name) {
      setStatus({ kind: "error", message: "Session expired. Please sign in again." });
      return;
    }

    setConductedSubmitAttempted(true);
    const errors = validateConducted();
    setConductedErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStatus({ kind: "error", message: "Please fix the highlighted fields." });
      return;
    }

    try {
      setStatus({ kind: "loading", message: "Uploading photos..." });
      const photoUrls = await uploadImagesToS3({ files: conducted.photos, token, purpose: "outreach" });
      setStatus({ kind: "loading", message: "Submitting outreach record..." });

      const body = {
        section_type: "conducted",
        location: conducted.location.trim(),
        date: conducted.date,
        duration: conducted.duration ? Number(conducted.duration) : undefined,
        photos: photoUrls,
        collaborator: conducted.collaborator,
        agronomist_specialist: conducted.collaborator,
        no_of_people: Number(conducted.no_of_people),
        invited_employee_ids: conducted.invited_employee_ids,
        employee_id: profile.id,
        employee_name: profile.name,
      };

      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const error = await res.json();
        setStatus({ kind: "error", message: error?.message || "Failed to create record" });
        return;
      }

      const data = await res.json();
      setRecords((prev) => [data.outreach, ...prev]);
      setConducted({ location: "", date: today, collaborator: "", no_of_people: "", duration: "", photos: [], invited_employee_ids: [] });
      setConductedSubmitAttempted(false);
      setConductedErrors({});
      setStatus({ kind: "success", message: "Conducted program record created successfully." });
      setTimeout(() => setStatus({ kind: "idle" }), 3000);
    } catch (error: any) {
      setStatus({ kind: "error", message: error?.message || "Failed to create record" });
    }
  };

  const handleSubmitAttended = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !profile?.id || !profile?.name) {
      setStatus({ kind: "error", message: "Session expired. Please sign in again." });
      return;
    }

    setAttendedSubmitAttempted(true);
    const errors = validateAttended();
    setAttendedErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStatus({ kind: "error", message: "Please fix the highlighted fields." });
      return;
    }

    try {
      setStatus({ kind: "loading", message: "Uploading photos..." });
      const photoUrls = await uploadImagesToS3({ files: attended.photos, token, purpose: "outreach" });
      setStatus({ kind: "loading", message: "Submitting outreach record..." });

      const body = {
        section_type: "attended",
        location: attended.location.trim(),
        date: attended.date,
        duration: attended.duration ? Number(attended.duration) : undefined,
        photos: photoUrls,
        instructor: attended.instructor.trim(),
        invited_employee_ids: attended.invited_employee_ids,
        employee_id: profile.id,
        employee_name: profile.name,
      };

      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const error = await res.json();
        setStatus({ kind: "error", message: error?.message || "Failed to create record" });
        return;
      }

      const data = await res.json();
      setRecords((prev) => [data.outreach, ...prev]);
      setAttended({ location: "", date: today, instructor: "", duration: "", photos: [], invited_employee_ids: [] });
      setAttendedSubmitAttempted(false);
      setAttendedErrors({});
      setStatus({ kind: "success", message: "Attended program record created successfully." });
      setTimeout(() => setStatus({ kind: "idle" }), 3000);
    } catch (error: any) {
      setStatus({ kind: "error", message: error?.message || "Failed to create record" });
    }
  };

  return (
    <AdminLayout title="Outreach Programs">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Outreach Programs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Record your outreach program activities.</p>
          </div>
          <Link
            to="/employee/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-white px-3.5 py-2 text-sm font-medium text-muted-foreground shadow-sm hover:border-primary/30 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
          {/* Tab switcher */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("conducted")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                activeTab === "conducted" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Users className="h-4 w-4" /> Conducted
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("attended")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                activeTab === "attended" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <CheckCircle2 className="h-4 w-4" /> Attended
            </button>
          </div>

          {/* Status banner */}
          {status.kind !== "idle" && (
            <div
              className={cn(
                "mb-5",
                status.kind === "success" && "rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800",
                status.kind === "error" && "rounded-xl border border-destructive/20 bg-destructive/6 p-3.5 text-sm font-medium text-destructive",
                status.kind === "loading" && "rounded-xl border border-border/50 bg-muted/40 p-3.5 text-sm text-muted-foreground"
              )}
            >
              {status.message}
            </div>
          )}

          {/* Conducted form */}
          {activeTab === "conducted" && (
            <form onSubmit={handleSubmitConducted} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" />Location</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Village Name, District"
                    value={conducted.location}
                    onChange={(e) => setConducted((s) => ({ ...s, location: e.target.value }))}
                    className={inputCls(conductedSubmitAttempted && !!conductedErrors.location)}
                  />
                  {conductedSubmitAttempted && conductedErrors.location && (
                    <p className="mt-1 text-xs font-medium text-destructive">{conductedErrors.location}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" />Date</span>
                  </label>
                  <input
                    type="date"
                    value={conducted.date}
                    onChange={(e) => setConducted((s) => ({ ...s, date: e.target.value }))}
                    className={inputCls(conductedSubmitAttempted && !!conductedErrors.date)}
                  />
                  {conductedSubmitAttempted && conductedErrors.date && (
                    <p className="mt-1 text-xs font-medium text-destructive">{conductedErrors.date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3 w-3" />Collaborator</span>
                  </label>
                  <select
                    value={conducted.collaborator}
                    onChange={(e) => setConducted((s) => ({ ...s, collaborator: e.target.value }))}
                    className={selectCls(conductedSubmitAttempted && !!conductedErrors.collaborator)}
                  >
                    <option value="">Select collaborator</option>
                    {COLLABORATOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {conductedSubmitAttempted && conductedErrors.collaborator && (
                    <p className="mt-1 text-xs font-medium text-destructive">{conductedErrors.collaborator}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3 w-3" />Number of Trainees / People Attended</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter number of participants"
                    value={conducted.no_of_people}
                    onChange={(e) => setConducted((s) => ({ ...s, no_of_people: e.target.value }))}
                    className={inputCls(conductedSubmitAttempted && !!conductedErrors.no_of_people)}
                  />
                  {conductedSubmitAttempted && conductedErrors.no_of_people ? (
                    <p className="mt-1 text-xs font-medium text-destructive">{conductedErrors.no_of_people}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Total number of participants.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3" />Duration (hours)</span>
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    placeholder="e.g., 2.5"
                    value={conducted.duration}
                    onChange={(e) => setConducted((s) => ({ ...s, duration: e.target.value }))}
                    className={inputCls()}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Invite other employees</label>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                  <input
                    type="text"
                    value={conductedInviteQuery}
                    onChange={(e) => setConductedInviteQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const matchingList = filterInvitees(conductedInviteQuery, conducted.invited_employee_ids);
                      if (matchingList.length === 0) return;
                      setConducted((s) => ({
                        ...s,
                        invited_employee_ids: toggleInvitee(s.invited_employee_ids, matchingList[0].id),
                      }));
                      setConductedInviteQuery("");
                    }}
                    placeholder="Type a name to invite employees"
                    className={inputCls()}
                  />
                  {conducted.invited_employee_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {conducted.invited_employee_ids.map((id) => {
                        const emp = employees.find((item) => item.id === id);
                        if (!emp) return null;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              setConducted((s) => ({
                                ...s,
                                invited_employee_ids: toggleInvitee(s.invited_employee_ids, id),
                              }))
                            }
                            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
                          >
                            {emp.name}
                            <X className="h-3 w-3" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="max-h-44 overflow-y-auto space-y-1">
                    {filteredConductedInvitees.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No matching employees found.</p>
                    ) : (
                      filteredConductedInvitees.map((employee) => (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => {
                            setConducted((s) => ({
                              ...s,
                              invited_employee_ids: toggleInvitee(s.invited_employee_ids, employee.id),
                            }));
                            setConductedInviteQuery("");
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/70"
                        >
                          <span className="text-sm text-foreground">{employee.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">{employee.role}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  <span className="inline-flex items-center gap-1.5"><Camera className="h-3 w-3" />Photos <span className="text-destructive">*</span></span>
                </label>
                <div className={cn(
                  "rounded-xl border-2 border-dashed bg-muted/20 p-5 text-center transition-all",
                  conductedSubmitAttempted && !!conductedErrors.photos 
                    ? "border-destructive/50 bg-destructive/5 hover:border-destructive/70" 
                    : "border-border/50 hover:border-primary/40 hover:bg-primary/4"
                )}>
                  <input id="photos-conducted" type="file" multiple accept="image/*" onChange={handleConductedPhotoChange} className="hidden" />
                  <label htmlFor="photos-conducted" className="cursor-pointer block">
                    <Upload className={cn("h-6 w-6 mx-auto mb-2", conductedSubmitAttempted && !!conductedErrors.photos ? "text-destructive" : "text-muted-foreground")} />
                    <p className={cn("text-sm", conductedSubmitAttempted && !!conductedErrors.photos ? "text-destructive font-medium" : "text-muted-foreground")}>
                      {conducted.photos.length > 0 ? `${conducted.photos.length} photo${conducted.photos.length > 1 ? "s" : ""} selected` : "Click to upload photos"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 5MB each</p>
                  </label>
                </div>
                {conductedSubmitAttempted && conductedErrors.photos && (
                  <p className="mt-1 text-xs font-medium text-destructive">{conductedErrors.photos}</p>
                )}
              </div>
              <Button type="submit" disabled={status.kind === "loading"} className="w-full h-11 rounded-xl font-semibold shadow-sm shadow-primary/20">
                {status.kind === "loading" ? "Submitting…" : "Submit Program Record"}
              </Button>
            </form>
          )}

          {/* Attended form */}
          {activeTab === "attended" && (
            <form onSubmit={handleSubmitAttended} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" />Location</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Training Center, Village Name"
                    value={attended.location}
                    onChange={(e) => setAttended((s) => ({ ...s, location: e.target.value }))}
                    className={inputCls(attendedSubmitAttempted && !!attendedErrors.location)}
                  />
                  {attendedSubmitAttempted && attendedErrors.location && (
                    <p className="mt-1 text-xs font-medium text-destructive">{attendedErrors.location}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" />Date</span>
                  </label>
                  <input
                    type="date"
                    value={attended.date}
                    onChange={(e) => setAttended((s) => ({ ...s, date: e.target.value }))}
                    className={inputCls(attendedSubmitAttempted && !!attendedErrors.date)}
                  />
                  {attendedSubmitAttempted && attendedErrors.date && (
                    <p className="mt-1 text-xs font-medium text-destructive">{attendedErrors.date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3 w-3" />Speaker / Lecturer / Instructor</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Name of the program instructor"
                    value={attended.instructor}
                    onChange={(e) => setAttended((s) => ({ ...s, instructor: e.target.value }))}
                    className={inputCls(attendedSubmitAttempted && !!attendedErrors.instructor)}
                  />
                  {attendedSubmitAttempted && attendedErrors.instructor && (
                    <p className="mt-1 text-xs font-medium text-destructive">{attendedErrors.instructor}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3" />Duration (hours)</span>
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    placeholder="e.g., 3.5"
                    value={attended.duration}
                    onChange={(e) => setAttended((s) => ({ ...s, duration: e.target.value }))}
                    className={inputCls()}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Invite other employees</label>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                  <input
                    type="text"
                    value={attendedInviteQuery}
                    onChange={(e) => setAttendedInviteQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const matchingList = filterInvitees(attendedInviteQuery, attended.invited_employee_ids);
                      if (matchingList.length === 0) return;
                      setAttended((s) => ({
                        ...s,
                        invited_employee_ids: toggleInvitee(s.invited_employee_ids, matchingList[0].id),
                      }));
                      setAttendedInviteQuery("");
                    }}
                    placeholder="Type a name to invite employees"
                    className={inputCls()}
                  />
                  {attended.invited_employee_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attended.invited_employee_ids.map((id) => {
                        const emp = employees.find((item) => item.id === id);
                        if (!emp) return null;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              setAttended((s) => ({
                                ...s,
                                invited_employee_ids: toggleInvitee(s.invited_employee_ids, id),
                              }))
                            }
                            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
                          >
                            {emp.name}
                            <X className="h-3 w-3" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="max-h-44 overflow-y-auto space-y-1">
                    {filteredAttendedInvitees.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No matching employees found.</p>
                    ) : (
                      filteredAttendedInvitees.map((employee) => (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => {
                            setAttended((s) => ({
                              ...s,
                              invited_employee_ids: toggleInvitee(s.invited_employee_ids, employee.id),
                            }));
                            setAttendedInviteQuery("");
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/70"
                        >
                          <span className="text-sm text-foreground">{employee.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">{employee.role}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  <span className="inline-flex items-center gap-1.5"><Camera className="h-3 w-3" />Photos <span className="text-destructive">*</span></span>
                </label>
                <div className={cn(
                  "rounded-xl border-2 border-dashed bg-muted/20 p-5 text-center transition-all",
                  attendedSubmitAttempted && !!attendedErrors.photos 
                    ? "border-destructive/50 bg-destructive/5 hover:border-destructive/70" 
                    : "border-border/50 hover:border-primary/40 hover:bg-primary/4"
                )}>
                  <input id="photos-attended" type="file" multiple accept="image/*" onChange={handleAttendedPhotoChange} className="hidden" />
                  <label htmlFor="photos-attended" className="cursor-pointer block">
                    <Upload className={cn("h-6 w-6 mx-auto mb-2", attendedSubmitAttempted && !!attendedErrors.photos ? "text-destructive" : "text-muted-foreground")} />
                    <p className={cn("text-sm", attendedSubmitAttempted && !!attendedErrors.photos ? "text-destructive font-medium" : "text-muted-foreground")}>
                      {attended.photos.length > 0 ? `${attended.photos.length} photo${attended.photos.length > 1 ? "s" : ""} selected` : "Click to upload photos"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 5MB each</p>
                  </label>
                </div>
                {attendedSubmitAttempted && attendedErrors.photos && (
                  <p className="mt-1 text-xs font-medium text-destructive">{attendedErrors.photos}</p>
                )}
              </div>
              <Button type="submit" disabled={status.kind === "loading"} className="w-full h-11 rounded-xl font-semibold shadow-sm shadow-primary/20">
                {status.kind === "loading" ? "Submitting…" : "Submit Attendance Record"}
              </Button>
            </form>
          )}
        </div>

        {/* Records */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border/40">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">View Records</h3>
            <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{records.length}</span>
          </div>

          {records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No outreach records yet.
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record, index) => {
                const uniqueKey = record.id ?? `${record.section_type}-${record.date}-${index}`;
                return (
                  <div key={uniqueKey} className="rounded-xl border border-border/50 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {record.section_type}
                        </p>
                        <p className="text-sm text-muted-foreground">{record.location}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{record.date}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {record.employee_name && <span>By {record.employee_name}</span>}
                      {typeof record.duration === "number" && <span>{record.duration} hrs</span>}
                      {typeof record.no_of_people === "number" && <span>{record.no_of_people} people</span>}
                      {record.invited_employee_names && record.invited_employee_names.length > 0 && (
                        <span>Invited: {record.invited_employee_names.join(", ")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}