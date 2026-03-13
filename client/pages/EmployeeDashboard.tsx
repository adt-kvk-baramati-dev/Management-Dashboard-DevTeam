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
  Plus,
  Sprout,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmployeeDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { icon: BarChart3, label: "Dashboard", href: "#dashboard" },
    { icon: Plus, label: "Register Complaint", href: "#register" },
    { icon: AlertCircle, label: "Assigned Complaints", href: "#assigned" },
    { icon: MapPin, label: "Field Visits", href: "#visits" },
    { icon: TrendingUp, label: "Outreach Programs", href: "#outreach" },
    { icon: MapPin, label: "Random Sampling", href: "#sampling" },
    { icon: Users, label: "Profile", href: "#profile" },
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
          {menuItems.map((item, i) => (
            <a
              key={i}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800/50 hover:text-emerald-400 transition-colors duration-200"
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </a>
          ))}
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
        <div className="h-16 bg-slate-800/50 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-6">
          <div className="flex items-center">
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
            <h1 className="text-2xl font-bold text-white">Employee Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">Field Officer</span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
              JD
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Dashboard Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome, Field Officer</h2>
            <p className="text-slate-400">Your assigned tasks and performance metrics</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Link to="#register">
              <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Register New Complaint
              </Button>
            </Link>
            <Link to="/employee/farmers/new">
              <Button
                variant="outline"
                className="w-full h-12 border-emerald-400 text-emerald-300 hover:bg-emerald-500/10 font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                Add New Farmer
              </Button>
            </Link>
            <Link to="#visits">
              <Button
                variant="outline"
                className="w-full h-12 border-indigo-400 text-indigo-300 hover:bg-indigo-500/10 font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <MapPin className="w-5 h-5" />
                Log Field Visit
              </Button>
            </Link>
            <Link to="#outreach">
              <Button
                variant="outline"
                className="w-full h-12 border-slate-600 text-slate-300 hover:bg-slate-700 font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                Report Outreach
              </Button>
            </Link>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Assigned Complaints */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-emerald-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-semibold text-sm">Assigned to You</h3>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white mb-2">23</p>
              <p className="text-emerald-400 text-xs font-semibold">12 pending review</p>
            </div>

            {/* Resolved This Month */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-indigo-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-semibold text-sm">Resolved This Month</h3>
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white mb-2">18</p>
              <p className="text-indigo-400 text-xs font-semibold">↑ 25% from last month</p>
            </div>

            {/* Field Visits */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-yellow-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-semibold text-sm">Field Visits</h3>
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white mb-2">42</p>
              <p className="text-yellow-400 text-xs font-semibold">This quarter</p>
            </div>

            {/* Expertise Area */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm hover:border-emerald-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-semibold text-sm">Expertise</h3>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <Sprout className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-2">Sugarcane</p>
              <p className="text-slate-400 text-xs">Domain expert specialty</p>
            </div>
          </div>

          {/* Assigned Complaints List */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-emerald-400" />
                Your Active Complaints
              </h3>
              <span className="text-slate-500 text-sm">Showing 5 of 23</span>
            </div>
            <div className="space-y-3">
              {[
                { id: 1, farmer: "Rajesh Kumar", crop: "Sugarcane", issue: "Pest Attack", status: "pending", priority: "High" },
                { id: 2, farmer: "Priya Sharma", crop: "Sugarcane", issue: "Nutrient Deficiency", status: "in_progress", priority: "Medium" },
                { id: 3, farmer: "Arun Patel", crop: "Sugarcane", issue: "Water Stress", status: "pending", priority: "High" },
                { id: 4, farmer: "Deepak Singh", crop: "Sugarcane", issue: "Crop Disease", status: "in_progress", priority: "High" },
                { id: 5, farmer: "Meera Das", crop: "Sugarcane", issue: "Irrigation Issue", status: "pending", priority: "Medium" },
              ].map((complaint) => (
                <div
                  key={complaint.id}
                  className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30 hover:bg-slate-700/30 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-slate-200 font-medium">{complaint.farmer}</p>
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">
                        {complaint.crop}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        complaint.priority === "High"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-yellow-500/20 text-yellow-300"
                      }`}>
                        {complaint.priority}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">{complaint.issue}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      complaint.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}>
                      {complaint.status === "pending" ? "Pending" : "In Progress"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Field Visits */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-white font-semibold text-lg mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-400" />
              Recent Field Visits
            </h3>
            <div className="space-y-3">
              {[
                { farmer: "Rajesh Kumar", date: "Today, 10:30 AM", crop: "Sugarcane" },
                { farmer: "Priya Sharma", date: "Yesterday, 2:15 PM", crop: "Sugarcane" },
                { farmer: "Arun Patel", date: "3 days ago", crop: "Sugarcane" },
              ].map((visit, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30"
                >
                  <div>
                    <p className="text-slate-200 font-medium">{visit.farmer}</p>
                    <p className="text-slate-500 text-sm">{visit.crop} · {visit.date}</p>
                  </div>
                  <button className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
