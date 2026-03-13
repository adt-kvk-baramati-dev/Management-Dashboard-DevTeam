import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Menu,
  LogOut,
  ArrowLeft,
  Sprout,
  Download,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Analytics() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeRange, setTimeRange] = useState("month");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-slate-900/80 backdrop-blur-md border-r border-slate-700/50 fixed h-full z-40 transition-all duration-300 overflow-y-auto`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700/50">
          <div className={`flex items-center gap-2 ${!sidebarOpen && "justify-center w-12"}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && <span className="text-lg font-bold text-white truncate">KVK</span>}
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800/50 hover:text-emerald-400 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Back to Dashboard</span>}
          </Link>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Link to="/login">
            <Button
              variant="outline"
              className={`w-full border-slate-600 text-slate-300 hover:bg-slate-800 ${
                !sidebarOpen && "p-2"
              }`}
            >
              <LogOut className="w-4 h-4" />
              {sidebarOpen && <span className="ml-2">Logout</span>}
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${sidebarOpen ? "ml-64" : "ml-20"} flex-1 transition-all duration-300`}>
        {/* Header */}
        <div className="h-16 bg-slate-800/50 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-6">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-400 hover:text-slate-200 mr-4"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
              Statistical Analytics
            </h1>
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Controls */}
          <div className="flex gap-4 mb-8 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-slate-800/50 border border-slate-700 text-white rounded-lg px-4 py-2 cursor-pointer hover:bg-slate-800 transition"
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
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
              <p className="text-slate-400 text-sm mb-2">Total Farmers</p>
              <p className="text-4xl font-bold text-white mb-2">10,234</p>
              <p className="text-emerald-400 text-xs font-semibold">↑ 8.2% growth</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
              <p className="text-slate-400 text-sm mb-2">Total Complaints</p>
              <p className="text-4xl font-bold text-white mb-2">562</p>
              <p className="text-indigo-400 text-xs font-semibold">↑ 12.5% increase</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
              <p className="text-slate-400 text-sm mb-2">Resolution Rate</p>
              <p className="text-4xl font-bold text-white mb-2">84.5%</p>
              <p className="text-emerald-400 text-xs font-semibold">↑ 2.1% improvement</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
              <p className="text-slate-400 text-sm mb-2">Avg Resolution Time</p>
              <p className="text-4xl font-bold text-white mb-2">3.2d</p>
              <p className="text-yellow-400 text-xs font-semibold">↓ 0.8 days</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Chart 1: District-wise Farmers */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-white font-semibold mb-6">District-wise Farmer Registration</h3>
              <div className="h-64 flex items-end justify-around gap-4 px-4 py-8 bg-slate-700/20 rounded-lg border border-slate-600/30">
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
                    <div key={item.name} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg" style={{ height: `${height}%`, minHeight: '40px' }}></div>
                      <span className="text-xs text-slate-400">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Complaint Category Distribution */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-white font-semibold mb-6">Complaint Category Distribution</h3>
              <div className="h-64 flex items-center justify-center bg-slate-700/20 rounded-lg border border-slate-600/30">
                <svg viewBox="0 0 200 200" className="w-48 h-48">
                  {/* Pie Chart Segments */}
                  <circle cx="100" cy="100" r="80" fill="url(#gradient1)" />
                  <circle cx="100" cy="100" r="80" fill="url(#gradient2)" style={{ clipPath: "polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%)" }} />
                  <circle cx="100" cy="100" r="50" fill="#0f172a" />
                  <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 0.8 }} />
                      <stop offset="100%" style={{ stopColor: "#059669", stopOpacity: 0.8 }} />
                    </linearGradient>
                    <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "#6366f1", stopOpacity: 0.8 }} />
                      <stop offset="100%" style={{ stopColor: "#4f46e5", stopOpacity: 0.8 }} />
                    </linearGradient>
                  </defs>
                  <text x="100" y="105" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="bold">Pie</text>
                </svg>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Pest Attack</span>
                  <span className="text-slate-300">28%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 bg-indigo-500 rounded-full"></span> Crop Disease</span>
                  <span className="text-slate-300">22%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-500 rounded-full"></span> Water Stress</span>
                  <span className="text-slate-300">18%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Other</span>
                  <span className="text-slate-300">32%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trend Analysis */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm mb-8">
            <h3 className="text-white font-semibold mb-6">Monthly Complaint Trends</h3>
            <div className="h-64 flex items-end justify-around gap-2 px-4 py-8 bg-slate-700/20 rounded-lg border border-slate-600/30">
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
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-lg hover:from-indigo-400 hover:to-indigo-300 transition-all duration-200"
                      style={{ height: `${height}%`, minHeight: "20px" }}
                      title={`${item.month}: ${item.value} complaints`}
                    ></div>
                    <span className="text-xs text-slate-500 group-hover:text-slate-300 transition">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="p-6 border-b border-slate-600/30">
              <h3 className="text-white font-semibold">Taluka-wise Farmer Statistics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700/20 border-b border-slate-600/30">
                    <th className="px-6 py-4 text-left text-slate-300 font-semibold">Taluka</th>
                    <th className="px-6 py-4 text-left text-slate-300 font-semibold">Total Farmers</th>
                    <th className="px-6 py-4 text-left text-slate-300 font-semibold">Active Complaints</th>
                    <th className="px-6 py-4 text-left text-slate-300 font-semibold">Resolved Complaints</th>
                    <th className="px-6 py-4 text-left text-slate-300 font-semibold">Resolution Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { taluka: "Talegaon", farmers: 1250, active: 45, resolved: 120, rate: "72.7%" },
                    { taluka: "Bhor", farmers: 980, active: 28, resolved: 95, rate: "77.2%" },
                    { taluka: "Baramati", farmers: 1520, active: 62, resolved: 145, rate: "70.0%" },
                    { taluka: "Indapur", farmers: 1100, active: 35, resolved: 110, rate: "75.9%" },
                    { taluka: "Saswad", farmers: 890, active: 22, resolved: 85, rate: "79.4%" },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-600/20 hover:bg-slate-700/20 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-slate-300 font-medium">{row.taluka}</td>
                      <td className="px-6 py-4 text-slate-300">{row.farmers}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-medium">
                          {row.active}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium">
                          {row.resolved}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-semibold">{row.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
