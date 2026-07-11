import React, { useEffect, useState, useMemo } from "react";
import { CheckCircle2, RefreshCw, X, Search, AlertTriangle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthProvider";
import {
  normalizeComplaintStatus,
  isRedAlert,
  getDaysPending,
  getStatusDisplay,
  type Complaint,
} from "@/lib/complaintUtils";

export default function EmployeeTasks() {
  const { token } = useAuth();
  const [assignedComplaints, setAssignedComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Complaint | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [solveRemark, setSolveRemark] = useState("");

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const complaintsRes = await fetch("/api/complaints", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const complaintsJson = await complaintsRes.json();
      if (!complaintsRes.ok) {
        console.error("Complaints API error:", complaintsJson);
      }

      setAssignedComplaints(complaintsJson.complaints || []);
    } catch (error) {
      console.error("Employee tasks fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewTaskDetails = async (task: Complaint) => {
    try {
      const response = await fetch(`/api/complaints/${task.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const fullComplaint = await response.json();
        setSelectedTask(fullComplaint);
        setSolveRemark(String(fullComplaint?.solved_remark ?? ""));
        setShowTaskModal(true);
      } else {
        console.error("Failed to fetch complaint details");
        setSelectedTask(task);
        setSolveRemark(String((task as any)?.solved_remark ?? ""));
        setShowTaskModal(true);
      }
    } catch (error) {
      console.error("Error fetching complaint details:", error);
      setSelectedTask(task);
      setSolveRemark(String((task as any)?.solved_remark ?? ""));
      setShowTaskModal(true);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const response = await fetch(`/api/complaints/${taskId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, remark: status === "Solved" ? solveRemark : "" }),
      });

      if (response.ok) {
        setAssignedComplaints((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, solve_status: status } : t)),
        );
        setSolveRemark("");
        setShowTaskModal(false);
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const formatComplaintId = (c: Complaint) => {
    if (c?.complaint_id) return c.complaint_id;
    const fallback = typeof c?.id === "string" ? c.id.slice(-4) : "----";
    return `C-${fallback}`;
  };

  const formatDate = (value: any) => {
    try {
      if (!value) return "-";
      return new Date(value).toLocaleDateString();
    } catch {
      return "-";
    }
  };

  const hasImage = (value?: string | null) =>
    typeof value === "string" && value.trim().length > 0;

  // Group complaints by status using utility functions
  const groupedComplaints = useMemo(() => {
    const pending: Complaint[] = [];
    const solved: Complaint[] = [];
    const redAlert: Complaint[] = [];

    for (const complaint of assignedComplaints) {
      const status = normalizeComplaintStatus(complaint.solve_status);
      if (status === "Solved") {
        solved.push(complaint);
      } else {
        pending.push(complaint);
        if (isRedAlert(complaint)) {
          redAlert.push(complaint);
        }
      }
    }

    return {
      pending: pending.sort((a, b) => getDaysPending(b) - getDaysPending(a)),
      solved: solved.sort((a, b) => getDaysPending(a) - getDaysPending(b)),
      redAlert: redAlert.sort((a, b) => getDaysPending(b) - getDaysPending(a)),
    };
  }, [assignedComplaints]);

  // Filter complaints based on search and active tab
  const displayComplaints = useMemo(() => {
    let complaints: Complaint[] = [];
    
    if (activeTab === "pending") {
      complaints = groupedComplaints.pending;
    } else if (activeTab === "solved") {
      complaints = groupedComplaints.solved;
    } else if (activeTab === "red-alert") {
      complaints = groupedComplaints.redAlert;
    }

    if (!search) return complaints;

    const query = search.toLowerCase();
    return complaints.filter(
      (c) =>
        formatComplaintId(c).toLowerCase().includes(query) ||
        (c.farmer_name && c.farmer_name.toLowerCase().includes(query)) ||
        (c.complaint_type && c.complaint_type.toLowerCase().includes(query)) ||
        (c.domain && c.domain.toLowerCase().includes(query))
    );
  }, [groupedComplaints, activeTab, search]);

  return (
    <AdminLayout title="My Tasks">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-headline font-semibold tracking-tight text-on-surface">
              My Assigned Tasks
            </h1>
            <p className="text-sm text-on-surface-variant">
              Manage your complaints and track SLA compliance.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search complaint..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl h-9"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl h-9 shrink-0"
              onClick={fetchTasks}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <p className="text-xs uppercase text-muted-foreground font-semibold">Total Tasks</p>
              <h2 className="text-2xl font-bold mt-1">{assignedComplaints.length}</h2>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <p className="text-xs uppercase text-amber-600 font-semibold">Pending</p>
              <h2 className="text-2xl font-bold text-amber-600 mt-1">{groupedComplaints.pending.length}</h2>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <p className="text-xs uppercase text-green-600 font-semibold">Solved</p>
              <h2 className="text-2xl font-bold text-green-600 mt-1">{groupedComplaints.solved.length}</h2>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-xs uppercase text-red-600 font-semibold">Red Alert</p>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mt-1">{groupedComplaints.redAlert.length}</h2>
            </CardContent>
          </Card>
        </section>

        {/* Tasks Section */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-auto p-0 gap-4 border-b w-full justify-start rounded-none">
              <TabsTrigger
                value="pending"
                className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 bg-transparent shadow-none"
              >
                Pending ({groupedComplaints.pending.length})
              </TabsTrigger>
              <TabsTrigger
                value="solved"
                className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 bg-transparent shadow-none"
              >
                Solved ({groupedComplaints.solved.length})
              </TabsTrigger>
              <TabsTrigger
                value="red-alert"
                className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 bg-transparent shadow-none flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Red Alert ({groupedComplaints.redAlert.length})
              </TabsTrigger>
            </TabsList>

            <Card className="rounded-2xl shadow-sm mt-4">
              <CardHeader className="space-y-1">
                <CardTitle className="font-headline text-lg">
                  {activeTab === "pending" && "My Pending Complaints"}
                  {activeTab === "solved" && "My Solved Complaints"}
                  {activeTab === "red-alert" && "My Red Alert Complaints"}
                </CardTitle>
                <CardDescription>
                  {activeTab === "red-alert"
                    ? "Complaints exceeding 4-day resolution window"
                    : "Click a task to view details and update status."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="rounded-2xl border bg-background p-6 text-center text-sm text-muted-foreground">
                    Loading tasks…
                  </div>
                ) : displayComplaints.length === 0 ? (
                  <div className="rounded-2xl border bg-background p-8 text-center">
                    <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {activeTab === "red-alert" && "Great! No overdue complaints"}
                      {activeTab === "pending" && "No pending tasks"}
                      {activeTab === "solved" && "No solved tasks yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayComplaints.map((c) => {
                      const daysPending = getDaysPending(c);
                      const isAlert = isRedAlert(c);
                      const statusDisplay = getStatusDisplay(c.solve_status);

                      return (
                        <div
                          key={c.id}
                          className={cn(
                            "w-full text-left rounded-2xl border bg-background p-4 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                            isAlert && "bg-red-50/50 border-red-200"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => viewTaskDetails(c)}
                            className="flex-1 text-left space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{formatComplaintId(c)}</p>
                              <Badge
                                variant="outline"
                                className={cn("rounded-full", statusDisplay.bgColor, statusDisplay.color)}
                              >
                                {statusDisplay.label}
                              </Badge>
                              {isAlert && (
                                <Badge className="rounded-full bg-red-600 text-white ml-auto sm:ml-0">
                                  {daysPending} days
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto sm:ml-0">
                                {formatDate(c.created_at)}
                              </span>
                            </div>

                            <p className="text-xs font-medium text-foreground">
                              {c.farmer_name} • <span className="text-muted-foreground">{c.complaint_type || c.domain}</span>
                            </p>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>{hasImage(c.image) ? "Image attached" : "No image"}</span>
                              {c.village && <span className="text-xs">📍 {c.village}</span>}
                            </div>
                          </button>

                          {/* Quick Actions */}
                          <div className="flex gap-2 sm:flex-col items-stretch shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                            {activeTab !== "solved" && (
                              <Button
                                size="sm"
                                className="rounded-xl text-xs h-8"
                                onClick={() => updateTaskStatus(c.id, "Solved")}
                              >
                                Mark Solved
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              className="rounded-xl text-xs h-8"
                              onClick={() => viewTaskDetails(c)}
                            >
                              Details
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>
      {/* Task Details Sheet */}
      <Sheet open={showTaskModal} onOpenChange={setShowTaskModal}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto custom-scrollbar p-0 flex flex-col gap-0">
          {selectedTask && (
            <>
              <div className="p-6 flex items-start justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-lg font-headline font-semibold tracking-tight">
                      Complaint Details
                    </SheetTitle>
                    <Badge
                      variant="outline"
                      className={cn("rounded-full", getStatusDisplay(selectedTask.solve_status).bgColor, getStatusDisplay(selectedTask.solve_status).color)}
                    >
                      {getStatusDisplay(selectedTask.solve_status).label}
                    </Badge>
                    {isRedAlert(selectedTask) && (
                      <Badge className="rounded-full bg-red-600 text-white">
                        {getDaysPending(selectedTask)} days
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ID: {formatComplaintId(selectedTask)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTaskModal(false)}
                  className="rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <Separator />

              <div className="overflow-y-auto p-6 space-y-6 flex-1">
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Farmer Information
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-2xl border bg-card p-4 shadow-sm">
                    <InfoField label="Name" value={selectedTask.farmer_name} />
                    <InfoField label="PRN" value={selectedTask.prn_no} />
                    <InfoField label="Phone" value={selectedTask.phone || "N/A"} />
                    <InfoField label="District" value={selectedTask.district || "N/A"} />
                    <InfoField label="Taluka" value={selectedTask.taluka || "N/A"} />
                    <InfoField label="Village" value={selectedTask.village || "N/A"} />
                    <InfoField label="Solved By" value={selectedTask.solved_by_name || "-"} />
                    <InfoField label="Remark" value={selectedTask.solved_remark || "-"} />
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Complaint Information
                  </h4>
                  <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <InfoField
                        label="Type"
                        value={selectedTask.complaint_type || selectedTask.domain}
                      />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Status
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "mt-1 rounded-full",
                            getStatusDisplay(selectedTask.solve_status).bgColor,
                            getStatusDisplay(selectedTask.solve_status).color
                          )}
                        >
                          {getStatusDisplay(selectedTask.solve_status).label}
                        </Badge>
                      </div>
                      <InfoField
                        label="Date Registered"
                        value={formatDate(selectedTask.created_at)}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Subject
                      </p>
                      <p className="mt-1 text-sm">{selectedTask.subject || "N/A"}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Complaint Details
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{selectedTask.complaint || "No details provided"}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Attached Image
                  </h4>
                  {hasImage(selectedTask.image) ? (
                    <img
                      src={selectedTask.image}
                      alt="Complaint attachment"
                      className="max-w-full h-auto rounded-2xl border"
                      loading="lazy"
                    />
                  ) : (
                    <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
                      No image available.
                    </div>
                  )}
                </section>
              </div>

              <div className="flex flex-wrap gap-3 p-6 bg-muted/30 border-t">
                {normalizeComplaintStatus(selectedTask.solve_status) !== "Solved" && (
                  <div className="w-full space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Remark before solving
                      </p>
                      <textarea
                        value={solveRemark}
                        onChange={(e) => setSolveRemark(e.target.value)}
                        placeholder="Add a short remark for the resolution..."
                        className="min-h-[96px] w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/12"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        className="rounded-xl"
                        onClick={() => updateTaskStatus(selectedTask.id, "Solved")}
                      >
                        Mark as Solved
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setSolveRemark("")}
                      >
                        Clear Remark
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl ml-auto"
                  onClick={() => setShowTaskModal(false)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}

function InfoField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value ?? "-"}</p>
    </div>
  );
}