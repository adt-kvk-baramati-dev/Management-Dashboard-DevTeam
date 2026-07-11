import { useState } from "react";
import {
  BarChart3,
  Download,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/AdminLayout";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("month");

  return (
    <AdminLayout title="analytics">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Statistical Analytics
          </h1>
          <Button className="rounded-xl flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        <div>
          {/* Controls */}
          <div className="flex gap-4 mb-8 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-on-surface-variant" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/40 text-on-surface rounded-xl px-4 py-2 cursor-pointer hover:bg-surface-container transition"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <p className="text-on-surface-variant text-sm mb-2">Total Farmers</p>
              <p className="text-4xl font-bold text-on-surface mb-2">10,234</p>
              <p className="text-primary text-xs font-semibold">
                ↑ 8.2% growth
              </p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <p className="text-on-surface-variant text-sm mb-2">Total Complaints</p>
              <p className="text-4xl font-bold text-on-surface mb-2">562</p>
              <p className="text-secondary-container text-xs font-semibold">
                ↑ 12.5% increase
              </p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <p className="text-on-surface-variant text-sm mb-2">Resolution Rate</p>
              <p className="text-4xl font-bold text-on-surface mb-2">84.5%</p>
              <p className="text-primary text-xs font-semibold">
                ↑ 2.1% improvement
              </p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <p className="text-on-surface-variant text-sm mb-2">Avg Resolution Time</p>
              <p className="text-4xl font-bold text-on-surface mb-2">3.2d</p>
              <p className="text-tertiary text-xs font-semibold">
                ↓ 0.8 days
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Chart 1: District-wise Farmers */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <h3 className="text-on-surface font-semibold mb-6">
                District-wise Farmer Registration
              </h3>
              <div className="h-64 flex items-end justify-around gap-4 px-4 py-8 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                {[
                  { name: "Pune", value: 2500 },
                  { name: "Nashik", value: 1800 },
                  { name: "Ahmednagar", value: 2100 },
                  { name: "Solapur", value: 1600 },
                  { name: "Kolhapur", value: 1400 },
                  { name: "Others", value: 834 },
                ].map((item) => {
                  const maxValue = 2500;
                  const height = (item.value / maxValue) * 100;
                  return (
                    <div
                      key={item.name}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div
                        className="w-full bg-primary/60 rounded-t-xl"
                        style={{ height: `${height}%`, minHeight: "40px" }}
                      ></div>
                      <span className="text-xs text-on-surface-variant">
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Complaint Category Distribution */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <h3 className="text-on-surface font-semibold mb-6">
                Complaint Category Distribution
              </h3>
              <div className="h-64 flex items-center justify-center bg-surface-container-low rounded-2xl border border-outline-variant/30">
                <svg viewBox="0 0 200 200" className="w-48 h-48">
                  <circle
                    cx="100"
                    cy="100"
                    r="70"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="24"
                    className="text-primary/30"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="70"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="24"
                    strokeDasharray="220 440"
                    strokeLinecap="round"
                    className="text-primary"
                    transform="rotate(-90 100 100)"
                  />
                  <text
                    x="100"
                    y="106"
                    textAnchor="middle"
                    className="fill-current text-on-surface"
                    fontSize="16"
                    fontWeight="bold"
                  >
                    Pie
                  </text>
                </svg>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-primary rounded-full"></span>{" "}
                    Pest Attack
                  </span>
                  <span className="text-on-surface-variant">28%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-secondary-container rounded-full"></span>{" "}
                    Crop Disease
                  </span>
                  <span className="text-on-surface-variant">22%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-tertiary-container rounded-full"></span>{" "}
                    Water Stress
                  </span>
                  <span className="text-on-surface-variant">18%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-outline rounded-full"></span>{" "}
                    Other
                  </span>
                  <span className="text-on-surface-variant">32%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trend Analysis */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm mb-8">
            <h3 className="text-on-surface font-semibold mb-6">
              Monthly Complaint Trends
            </h3>
            <div className="h-64 flex items-end justify-around gap-2 px-4 py-8 bg-surface-container-low rounded-2xl border border-outline-variant/30">
              {[
                { month: "Jan", value: 45 },
                { month: "Feb", value: 52 },
                { month: "Mar", value: 48 },
                { month: "Apr", value: 61 },
                { month: "May", value: 55 },
                { month: "Jun", value: 67 },
                { month: "Jul", value: 72 },
                { month: "Aug", value: 68 },
                { month: "Sep", value: 75 },
                { month: "Oct", value: 78 },
                { month: "Nov", value: 82 },
                { month: "Dec", value: 87 },
              ].map((item) => {
                const maxValue = 87;
                const height = (item.value / maxValue) * 100;
                return (
                  <div
                    key={item.month}
                    className="flex-1 flex flex-col items-center gap-2 group"
                  >
                    <div
                        className="w-full bg-secondary-container/70 rounded-t-xl transition-all duration-200"
                      style={{ height: `${height}%`, minHeight: "20px" }}
                      title={`${item.month}: ${item.value} complaints`}
                    ></div>
                      <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-outline-variant/30">
              <h3 className="text-on-surface font-semibold">
                Taluka-wise Farmer Statistics
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30">
                    <th className="px-6 py-4 text-left text-on-surface-variant font-semibold">
                      Taluka
                    </th>
                    <th className="px-6 py-4 text-left text-on-surface-variant font-semibold">
                      Total Farmers
                    </th>
                    <th className="px-6 py-4 text-left text-on-surface-variant font-semibold">
                      Active Complaints
                    </th>
                    <th className="px-6 py-4 text-left text-on-surface-variant font-semibold">
                      Resolved Complaints
                    </th>
                    <th className="px-6 py-4 text-left text-on-surface-variant font-semibold">
                      Resolution Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      taluka: "Talegaon",
                      farmers: 1250,
                      active: 45,
                      resolved: 120,
                      rate: "72.7%",
                    },
                    {
                      taluka: "Bhor",
                      farmers: 980,
                      active: 28,
                      resolved: 95,
                      rate: "77.2%",
                    },
                    {
                      taluka: "Baramati",
                      farmers: 1520,
                      active: 62,
                      resolved: 145,
                      rate: "70.0%",
                    },
                    {
                      taluka: "Indapur",
                      farmers: 1100,
                      active: 35,
                      resolved: 110,
                      rate: "75.9%",
                    },
                    {
                      taluka: "Saswad",
                      farmers: 890,
                      active: 22,
                      resolved: 85,
                      rate: "79.4%",
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-on-surface font-medium">
                        {row.taluka}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {row.farmers}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-tertiary-fixed/60 text-on-tertiary-fixed-variant rounded-xl text-xs font-medium border border-outline-variant/30">
                          {row.active}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-primary-fixed/60 text-on-primary-fixed-variant rounded-xl text-xs font-medium border border-outline-variant/30">
                          {row.resolved}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface font-semibold">
                        {row.rate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
