import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Users,
  AlertCircle,
  CheckCircle,
  MapPin,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Database,
  Sprout,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { icon: BarChart3, label: "Dashboard", href: "/admin/dashboard" },
    { icon: Database, label: "Farmers Database", href: "#farmers" },
    { icon: AlertCircle, label: "Complaints Management", href: "/admin/complaints" },
    { icon: Zap, label: "Complaint Routing", href: "#routing" },
    { icon: Users, label: "Employees", href: "/admin/users" },
    { icon: Sprout, label: "Field Activities", href: "#activities" },
    { icon: TrendingUp, label: "Outreach Programs", href: "#outreach" },
    { icon: MapPin, label: "Random Sampling", href: "#sampling" },
    { icon: MapPin, label: "GIS Map", href: "/admin/gis-map" },
    { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
    { icon: Settings, label: "Settings", href: "#settings" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-slate-900/80 backdrop-blur-md border-r border-slate-700/50 fixed h-full z-40 transition-all duration-300 overflow-y-auto`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700/50">
          <div className={`flex items-center gap-2 ${!sidebarOpen && "justify-center w-12"}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && <span className="text-lg font-bold text-white truncate">KVK</span>}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item, i) => {
            const isExternal = item.href.startsWith("#");
            return isExternal ? (
              <a
                key={i}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800/50 hover:text-emerald-400 transition-colors duration-200"
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </a>
            ) : (
              <Link
                key={i}
                to={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800/50 hover:text-emerald-400 transition-colors duration-200"
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
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
        <div className="h-16 bg-slate-800/50 backdrop-blur-md border-b border-slate-700/50 flex items-center px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-slate-200 mr-4"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Dashboard Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome, Administrator</h2>
            <p className="text-slate-400">Monitor and manage KVK operations in real-time</p>
          </div>

          {/* Widgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Farmers */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-emerald-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-semibold text-sm">Total Farmers</h3>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white mb-2">10,234</p>
              <p className="text-emerald-400 text-xs font-semibold">↑ 12% from last month</p>
            </div>

            {/* Total Complaints */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-indigo-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-semibold text-sm">Total Complaints</h3>
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white mb-2">562</p>
              <p className="text-indigo-400 text-xs font-semibold">↑ 8% from last month</p>
            </div>

            {/* Pending Complaints */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-yellow-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-semibold text-sm">Pending Complaints</h3>
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white mb-2">87</p>
              <p className="text-yellow-400 text-xs font-semibold">15% of total</p>
            </div>

            {/* Resolved Complaints */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-emerald-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-semibold text-sm">Resolved Complaints</h3>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white mb-2">475</p>
              <p className="text-emerald-400 text-xs font-semibold">↑ 9% from last month</p>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Active Employees */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-emerald-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-semibold text-sm">Active Employees</h3>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-2">156</p>
              <p className="text-slate-400 text-xs">24 field officers, 18 domain experts</p>
            </div>

            {/* Outreach Programs */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-indigo-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-semibold text-sm">Outreach Programs</h3>
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-2">34</p>
              <p className="text-slate-400 text-xs">This quarter conducted</p>
            </div>

            {/* Random Sampling */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-emerald-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-semibold text-sm">Sampling Reports</h3>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-2">289</p>
              <p className="text-slate-400 text-xs">Ground truth verifications</p>
            </div>
          </div>

          {/* Data Visualization Placeholder */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart Placeholder 1 */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-white font-semibold mb-6">District-wise Farmer Registration</h3>
              <div className="h-64 flex items-center justify-center bg-slate-700/20 rounded-lg border border-slate-600/30">
                <p className="text-slate-500 text-sm">Bar Chart Visualization</p>
              </div>
            </div>

            {/* Chart Placeholder 2 */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-white font-semibold mb-6">Category-wise Farmer Distribution</h3>
              <div className="h-64 flex items-center justify-center bg-slate-700/20 rounded-lg border border-slate-600/30">
                <p className="text-slate-500 text-sm">Pie Chart Visualization</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-white font-semibold mb-6">Recent Activities</h3>
            <div className="space-y-4">
              {[
                { action: "New complaint registered", time: "2 hours ago", type: "complaint" },
                { action: "Employee logged field visit", time: "4 hours ago", type: "activity" },
                { action: "Farmer database updated", time: "6 hours ago", type: "database" },
                { action: "Complaint resolved", time: "8 hours ago", type: "resolved" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30 hover:bg-slate-700/30 transition"
                >
                  <div>
                    <p className="text-slate-200 text-sm font-medium">{item.action}</p>
                    <p className="text-slate-500 text-xs">{item.time}</p>
                  </div>
                  <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
