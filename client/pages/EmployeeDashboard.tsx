import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  FileText,
  MapPin,
  TrendingUp,
  X,
  Calendar,
  Layers,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "../lib/AuthProvider";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function EmployeeDashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [assignedComplaints, setAssignedComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, complaintsRes] = await Promise.all([
        fetch("/api/stats/employee", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/complaints", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const statsJson = await statsRes.json();
      const complaintsJson = await complaintsRes.json();

      if (!complaintsRes.ok) {
        console.error("Complaints API error:", complaintsJson);
      }

      setStats(statsJson);
      setAssignedComplaints(complaintsJson.complaints || []);
    } catch (error) {
      console.error("Employee dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewTaskDetails = async (task: any) => {
    try {
      const response = await fetch(`/api/complaints/${task.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const fullComplaint = await response.json();
        setSelectedTask(fullComplaint);
        setShowTaskModal(true);
      } else {
        console.error("Failed to fetch complaint details");
        setSelectedTask(task);
        setShowTaskModal(true);
      }
    } catch (error) {
      console.error("Error fetching complaint details:", error);
      setSelectedTask(task);
      setShowTaskModal(true);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    const remark = status === "Solved"
      ? window.prompt("Enter a remark for this solved complaint (optional):") ?? ""
      : "";

    try {
      const response = await fetch(`/api/complaints/${taskId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, remark }),
      });

      if (response.ok) {
        setAssignedComplaints((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, solve_status: status } : t)),
        );
        setShowTaskModal(false);
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const quickStats = useMemo(
    () => [
      {
        title: "Assigned Tasks",
        value: stats?.assignedTasks || 0,
        icon: ClipboardList,
        href: "/employee/tasks",
      },
      {
        title: "Visits Completed",
        value: stats?.visitsCompleted || 0,
        icon: MapPin,
        href: "/employee/field-visit",
      },
      {
        title: "Outreach Sessions Conducted",
        value: stats?.sessionsHosted || 0,
        icon: TrendingUp,
        href: "/employee/outreach",
      },
      {
        title: "Random Sampling",
        value: stats?.dataSamplings || 0,
        icon: Activity,
        href: "/employee/sampling",
      },
    ],
    [
      stats?.assignedTasks,
      stats?.dataSamplings,
      stats?.sessionsHosted,
      stats?.visitsCompleted,
    ]
  );

  // Computes the dynamic data for the Donut Chart based on real assigned complaints
  const pieData = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let solved = 0;

    assignedComplaints.forEach((c) => {
      const status = (c.solve_status || "Pending").toLowerCase();
      if (status === "solved") solved++;
      else if (status === "in progress") inProgress++;
      else pending++;
    });

    return [
      { name: "Pending", value: pending, color: "#F59E0B" },
      { name: "In Progress", value: inProgress, color: "#3B82F6" },
      { name: "Solved", value: solved, color: "#10B981" },
    ];
  }, [assignedComplaints]);

  const getStatusBadgeClass = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "solved":
        return "border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
      case "in progress":
        return "border-0 bg-blue-100 text-blue-700 hover:bg-blue-100";
      case "pending":
        return "border-0 bg-amber-100 text-amber-700 hover:bg-amber-100";
      default:
        return "border-0 bg-slate-100 text-slate-700 hover:bg-slate-100";
    }
  };

  const getStatusLabel = (status?: string) => status || "Pending";

  const formatComplaintId = (c: any) => {
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

  const weeklyData = [
    { day: "Mon", visits: 4 },
    { day: "Tue", visits: 7 },
    { day: "Wed", visits: 5 },
    { day: "Thu", visits: 9 },
    { day: "Fri", visits: 6 },
    { day: "Sat", visits: 3 },
  ];

  // Computes weekly performance summary dynamic count
  const totalWeeklyVisits = useMemo(() => weeklyData.reduce((acc, curr) => acc + curr.visits, 0), []);

  return (
    <AdminLayout title="farmers, complaints...">
      {/* 7. Better Page Width Applied */}
      <div className="mx-auto max-w-[1700px] space-y-8">
        
        {/* 1. Hero Actions Section */}
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-semibold tracking-tight">
              Welcome back  {user?.name || "Officer"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your field tasks and assigned complaints.
            </p>
          </div>
          {/* <div className="flex gap-3">
            <Button asChild className="rounded-xl">
              <Link to="/employee/field-visit">Log Visit</Link>
            </Button>
            <Button variant="outline" asChild className="rounded-xl">
              <Link to="/employee/tasks">My Tasks</Link>
            </Button>
          </div> */}
        </section>

        {/* 2. Stats Cards with Status Chips */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {quickStats.map((item) => (
            <Link key={item.title} to={item.href}>
              <Card className="rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.title}
                  </CardTitle>
        
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-4 w-4 text-primary" />
                  </span>
                </CardHeader>
        
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loading ? "…" : item.value}
                  </div>
        
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Updated today
                    </span>
        
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100/80">
                      Live
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        {/* Middle Section: Assigned Tasks & Weekly Activity */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Assigned Tasks Card */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="font-headline">Assigned Tasks</CardTitle>
                <CardDescription>
                  Complaints and tasks assigned to you.
                </CardDescription>
              </div>
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/employee/tasks">View All</Link>
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {loading ? (
                <div className="rounded-2xl border bg-background p-6 text-center text-sm text-muted-foreground">
                  Loading tasks…
                </div>
              ) : assignedComplaints.length === 0 ? (
                <div className="rounded-2xl border bg-background p-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No assigned tasks
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
                  {assignedComplaints.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => viewTaskDetails(c)}
                      /* 4. Assigned Tasks Priority Strip Implementation */
                      className={cn(
                        "w-full text-left rounded-2xl border bg-background p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20",
                        getStatusLabel(c.solve_status) === "Pending" && "border-l-4 border-l-amber-500",
                        getStatusLabel(c.solve_status) === "In Progress" && "border-l-4 border-l-blue-500",
                        getStatusLabel(c.solve_status) === "Solved" && "border-l-4 border-l-emerald-500"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">
                              {formatComplaintId(c)}
                            </p>
                            <Badge
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-medium",
                                getStatusBadgeClass(getStatusLabel(c.solve_status))
                              )}
                            >
                              {getStatusLabel(c.solve_status)}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {c.farmer_name} • {c.complaint_type || c.domain}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {hasImage(c.image) ? "Image attached" : "No image available"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(c.created_at)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Activity Card */}
          {/* <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
              <CardDescription>
                Field visits completed this week
              </CardDescription>
            </CardHeader>
          
            <CardContent>
              {/* 5. Weekly Activity KPI Header Addition */}
              {/*<div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Visits This Week
                  </p>
                  <p className="text-3xl font-bold">
                    {totalWeeklyVisits}
                  </p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100/80">
                  +12%
                </Badge>
              </div>

              <div className="h-[268px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="visits"
                      radius={[8, 8, 0, 0]}
                      fill="#2E7D32"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card> */}

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Task Status Breakdown</CardTitle>
              <CardDescription>
                Distribution of assigned complaint statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          
        </section>

        {/* Lower Section: Task Status Chart & Action Center Layout */}
        {/* <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 6. Donut Chart Component Addition */}
          {/* <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Task Status Breakdown</CardTitle>
              <CardDescription>
                Distribution of assigned complaint statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          3. Action Center with Premium Cards and Hover State lifts */}
         {/* <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Action Center</CardTitle>
              <CardDescription>
                Quick pathways to routine field responsibilities
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/employee/field-visit"
                className="group rounded-2xl border bg-background p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 text-left flex items-start gap-4"
              >
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">Log New Visit</h4>
                  <p className="text-xs text-muted-foreground mt-1">Register ongoing farm locations.</p>
                </div>
              </Link>

              <Link
                to="/employee/tasks"
                className="group rounded-2xl border bg-background p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 text-left flex items-start gap-4"
              >
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm group-hover:text-amber-600 transition-colors">Pending Tasks</h4>
                  <p className="text-xs text-muted-foreground mt-1">Review critical issues waiting actions.</p>
                </div>
              </Link>
            </CardContent>
          </Card>
        </section> */}
      </div>

      {/* Task Details Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border bg-background shadow-md">
            <div className="p-6 flex items-start justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-lg font-headline font-semibold tracking-tight">
                  Complaint Details
                </h3>
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

            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6 custom-scrollbar">
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
                        className={cn(
                          "mt-1 rounded-full px-3 py-1 text-xs font-medium",
                          getStatusBadgeClass(getStatusLabel(selectedTask.solve_status))
                        )}
                      >
                        {getStatusLabel(selectedTask.solve_status)}
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
                    <p className="mt-1 text-sm">
                      {selectedTask.subject || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Complaint Details
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {selectedTask.complaint || "No details provided"}
                    </p>
                  </div>
                </div>
              </section>

              {selectedTask.progress && selectedTask.progress.length > 0 && (
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Progress Timeline
                  </h4>
                  <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
                    {selectedTask.progress.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm">{item.note}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(item.date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedTask.resolution_notes && (
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resolution Notes
                  </h4>
                  <div className="rounded-2xl border bg-primary/5 p-4 shadow-sm">
                    <p className="text-sm">{selectedTask.resolution_notes}</p>
                  </div>
                </section>
              )}

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

              <div className="flex flex-wrap gap-3 pt-2">
                {getStatusLabel(selectedTask.solve_status) !== "Solved" && (
                  <>
                    {getStatusLabel(selectedTask.solve_status) !== "In Progress" && (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => updateTaskStatus(selectedTask.id, "In Progress")}
                      >
                        Mark as In Progress
                      </Button>
                    )}
                    <Button
                      type="button"
                      className="rounded-xl"
                      onClick={() => updateTaskStatus(selectedTask.id, "Solved")}
                    >
                      Mark as Solved
                    </Button>
                  </>
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
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function InfoField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value ?? "-"}</p>
    </div>
  );
}