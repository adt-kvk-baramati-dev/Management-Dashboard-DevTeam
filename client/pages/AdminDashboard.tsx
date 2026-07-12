import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, } from "recharts";
import { Users, AlertCircle, MapPin, TrendingUp, CheckCircle2, ListTodo, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../lib/AuthProvider";
import FarmerMap from "@/components/FarmerMap";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);

  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [reportGenerating, setReportGenerating] = useState(false);
  const [notificationSending, setNotificationSending] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [statsRes, complaintsRes] = await Promise.all([
        fetch("/api/stats/admin", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/complaints", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const statsJson = await statsRes.json();
      console.log("Stats API Response:", statsJson);

      const complaintsJson = await complaintsRes.json();
      
      const last6Months: string[] = [];
      const d = new Date();
      for (let i = 5; i >= 0; i--) {
        const past = new Date(d.getFullYear(), d.getMonth() - i, 1);
        last6Months.push(past.toLocaleString("default", { month: "short" }));
      }
      
      const monthlyMap: Record<string, number> = {};
      last6Months.forEach(m => monthlyMap[m] = 0);

      (complaintsJson.complaints || []).forEach((c: any) => {
        const date = new Date(c.created_at || c.createdAt || c.date);
        if (isNaN(date.getTime())) return;
        
        const month = date.toLocaleString("default", { month: "short" });
        if (monthlyMap[month] !== undefined) {
          monthlyMap[month]++;
        }
      });

      const chart = last6Months.map(month => ({ month, complaints: monthlyMap[month] }));

      const statusMap: Record<string, number> = {};
      (complaintsJson.complaints || []).forEach((c: any) => {
        const status = c.solve_status || "Pending";
        statusMap[status] = (statusMap[status] || 0) + 1;
      });

      setStats({
        totalFarmers: statsJson.registeredFarmers,
        totalComplaints: (statsJson.openComplaints ?? 0) + (statsJson.resolvedComplaints ?? 0),
        pendingComplaints: statsJson.openComplaints,
        activeEmployees: statsJson.activeEmployees,
        outreachSessions: statsJson.outreachSessions ?? 0,
        samplingActivities: statsJson.samplingActivities ?? 0,
        chartData: chart,
        pieData: Object.entries(statusMap).map(([name, value]) => ({ name, value }))
      });
      setRecentComplaints((complaintsJson.complaints || []).slice(0, 5));
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setLoadError("Couldn’t load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!token) return;
    setReportGenerating(true);
    try {
      const response = await fetch("/api/admin/generate-report", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "comprehensive",
          dateRange: "last_30_days"
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kvk-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report generated",
        description: "Your PDF report download has started.",
      });
    } catch (error) {
      console.error("Report generation error:", error);
      toast({
        title: "Report failed",
        description: "Couldn’t generate the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReportGenerating(false);
    }
  };

  const sendNotification = async (message: string) => {
    if (!token) return;
    const trimmed = message.trim();
    if (!trimmed) return;

    setNotificationSending(true);

    try {
      const response = await fetch("/api/admin/send-notification", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
      });

      if (response.ok) {
        toast({
          title: "Notification sent",
          description: "Employees will receive your message shortly.",
        });
        setIsNotifyOpen(false);
        setNotifyMessage("");
      } else {
        throw new Error("Failed to send notification");
      }
    } catch (error) {
      console.error("Notification error:", error);
      toast({
        title: "Send failed",
        description: "Couldn’t send the notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setNotificationSending(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    Pending: "#f59e0b",
    Solved: "#10b981",
    "Red Zone": "#e20b0b",
  };

  const getStatusColor = (status: string) =>
    STATUS_COLORS[status] ?? "hsl(var(--muted-foreground))";

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div
        className={cn(
          "rounded-xl border border-outline-variant/30",
          "bg-surface-container-lowest px-3 py-2 shadow-sm",
        )}
      >
        {label ? (
          <p className="text-xs font-semibold text-on-surface mb-1">{label}</p>
        ) : null}
        <div className="space-y-0.5">
          {payload.map((item: any, idx: number) => (
            <div key={item.dataKey ?? idx} className="flex items-center justify-between gap-6">
              <span className="text-xs text-on-surface-variant">
                {item.name ?? item.dataKey}
              </span>
              <span className="text-xs font-semibold text-on-surface tabular-nums">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const chartData = useMemo(() => stats?.chartData || [], [stats]);
  const pieData = useMemo(() => stats?.pieData || [], [stats]);
  const cardBase =
    "bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm";
  const cardHover =
    "transition-all duration-200 hover:shadow-md hover:border-outline-variant/60";

  const cardHeaderClass = "pb-4 border-b border-outline-variant/20";
  const cardBodyClass = "pt-4";

  const StatCard = ({ title, value, icon: Icon, trend, colorClass, href }: any) => {
    const CardContent = (
      <div className={cn(cardBase, "relative overflow-hidden", "h-full p-6 group cursor-pointer", "rounded-3xl", "shadow-lg hover:shadow-[0_20px_50px_rgba(59,130,246,0.25)]", "hover:-translate-y-1", "transition-all duration-300", cardHover,)}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 group-hover:text-primary transition-colors">
              {title}
            </p>

            <h3 className="text-4xl font-bold tracking-tight text-on-surface leading-none tabular-nums">
              {Number(value).toLocaleString()}
            </h3>
          </div>
          <div
            className={cn(
              "p-4 rounded-2xl",
              "shadow-sm",
              "group-hover:scale-110",
              "transition-all duration-300",
              colorClass,
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-on-surface-variant font-medium">
            {trend}
          </p>

          <span className="px-2 py-1 text-[10px] rounded-full bg-green-100 text-green-700 font-semibold">
            Live
          </span>
        </div>
      </div>
    );

    if (href) {
      return (
        <Link
          to={href}
          className={cn(
            "block no-underline rounded-2xl",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          )}
        >
          {CardContent}
        </Link>
      );
    }
    return CardContent;
  };

  const statusPillClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "resolved" || s === "solved") {
      return "bg-primary-fixed/60 text-on-primary-fixed-variant border-primary-fixed-dim/60";
    }
    if (s === "pending") {
      return "bg-tertiary-fixed/70 text-on-tertiary-fixed border-tertiary-fixed-dim/70";
    }
    return "bg-secondary-fixed/70 text-on-secondary-fixed-variant border-secondary-fixed-dim/70";
  };
  return (
    <AdminLayout title="farmers, complaints...">

      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 flex items-center justify-center text-white text-2xl shadow-lg">
            📊
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Admin Dashboard
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Real-time monitoring of farmers, complaints, outreach and field activities
            </p>
          </div>
        </div>
      </div>

      {loadError ? (
        <div
          className={cn(cardBase, cardHover, "p-4 bg-surface-container-low")}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface">Unable to load</p>
              <p className="text-sm text-on-surface-variant mt-1">{loadError}</p>
            </div>
            <Button variant="outline" onClick={fetchDashboardData} className="rounded-xl">
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5 lg:gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className={cn(cardBase, "p-5")}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 bg-surface-container-low" />
                  <Skeleton className="h-7 w-16 bg-surface-container-low" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl bg-surface-container-low" />
              </div>
              <Skeleton className="h-3 w-28 rounded-xl bg-surface-container-low" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total Farmers"
              value={stats?.totalFarmers || 0}
              icon={Users}
              trend="Real-time count"
              colorClass="bg-primary/10 text-primary"
              href="/admin/farmers"
            />
            <StatCard
              title="Total Complaints"
              value={stats?.totalComplaints || 0}
              icon={ListTodo}
              trend="All reported issues"
              colorClass="bg-secondary-fixed/70 text-on-secondary-fixed-variant"
              href="/admin/complaints"
            />
            <StatCard
              title="Pending Complaints"
              value={stats?.pendingComplaints || 0}
              icon={AlertCircle}
              trend="Requires attention"
              colorClass="bg-tertiary-fixed/70 text-on-tertiary-fixed"
              href="/admin/complaints?status=Pending"
            />
            <StatCard
              title="Outreach Sessions"
              value={stats?.outreachSessions || 0}
              icon={TrendingUp}
              trend="Programs completed"
              colorClass="bg-primary-fixed/60 text-on-primary-fixed-variant"
              href="/admin/outreach"
            />
            <StatCard
              title="Random Sampling"
              value={stats?.samplingActivities || 0}
              icon={MapPin}
              trend="Field samples taken"
              colorClass="bg-tertiary-fixed/70 text-on-tertiary-fixed"
              href="/admin/sampling"
            />
            <StatCard
              title="Active Employees"
              value={stats?.activeEmployees || 0}
              icon={CheckCircle2}
              trend="Currently active"
              colorClass="bg-secondary-fixed/70 text-on-secondary-fixed-variant"
              href="/admin/employees"
            />
            <StatCard
              title="Critical Alerts"
              value={stats?.pendingComplaints || 0}
              icon={AlertCircle}
              trend="Requires attention"
              colorClass="bg-error/10 text-error border border-error/20"
              href="/admin/complaints?status=Pending"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className={cn(cardBase, cardHover, "lg:col-span-2 p-6")}>
          <div className={cn("flex items-start justify-between gap-4", cardHeaderClass)}>
            <div>
              <h3 className="font-headline font-bold text-on-surface">
                Monthly Complaints Flow
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Trend over time based on complaint volume.
              </p>
            </div>
          </div>

          <div className={cn(cardBodyClass, "h-[250px] w-full")}>
            {loading ? (
              <div className="h-full w-full">
                <Skeleton className="h-full w-full rounded-xl bg-surface-container-low" />
              </div>
            ) : chartData.length === 0 ? (
              <div className={cn(
                "h-full w-full rounded-xl border border-outline-variant/20",
                "bg-surface-container-low flex items-center justify-center",
              )}>
                <p className="text-sm text-on-surface-variant">No chart data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="complaints"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{
                      r: 3,
                      fill: "hsl(var(--primary))",
                      strokeWidth: 2,
                      stroke: "hsl(var(--background))",
                    }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Pie */}
        <div className={cn(cardBase, cardHover, "p-6 flex flex-col")}>
          <div className={cn(cardHeaderClass, "mb-3")}>
            <h3 className="font-headline font-bold text-on-surface">
              Complaint Status
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Breakdown by resolution state.
            </p>
          </div>
          <div className={cn(cardBodyClass, "flex-1 flex items-center justify-center")}>
            <div className="h-[200px] w-full">
              {loading ? (
                <Skeleton className="h-full w-full rounded-xl bg-surface-container-low" />
              ) : pieData.length === 0 ? (
                <div className={cn(
                  "h-full w-full rounded-xl border border-outline-variant/20",
                  "bg-surface-container-low flex items-center justify-center",
                )}>
                  <p className="text-sm text-on-surface-variant">No status data yet.</p>
                </div>
              ) : (
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
                      {pieData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getStatusColor(entry.name)}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-3">
            {pieData.map((entry: any) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-xl"
                  style={{ backgroundColor: getStatusColor(entry.name) }}
                ></div>
                <span className="text-xs text-on-surface-variant font-medium">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Maharashtra Map Visualization */}
      <div className={cn(cardBase, cardHover, "p-4 md:p-5")}>
        <div className="h-[560px] w-full">
          {token ? <FarmerMap token={token} /> : (
            <div className={cn(
              "h-full w-full rounded-xl border border-outline-variant/20",
              "bg-surface-container-low flex items-center justify-center",
            )}>
              <p className="text-sm text-on-surface-variant">Sign in to view map data.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
