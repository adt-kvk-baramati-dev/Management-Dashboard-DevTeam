import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Filter,
  Search,
  ChevronDown,
  Sprout,
  Menu,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ComplaintsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const complaints = [
    {
      id: "COMP001",
      farmer: "Rajesh Kumar",
      prn: "PRN12345",
      crop: "Sugarcane",
      issue: "Pest Attack",
      source: "Krushik App",
      status: "pending",
      priority: "High",
      registered: "2 hours ago",
      assignedTo: "John Doe",
    },
    {
      id: "COMP002",
      farmer: "Priya Sharma",
      prn: "PRN12346",
      crop: "Sugarcane",
      issue: "Nutrient Deficiency",
      source: "IoT (Fasal)",
      status: "in_progress",
      priority: "Medium",
      registered: "4 hours ago",
      assignedTo: "Jane Smith",
    },
    {
      id: "COMP003",
      farmer: "Arun Patel",
      prn: "PRN12347",
      crop: "Sugarcane",
      issue: "Water Stress",
      source: "Manual Entry",
      status: "pending",
      priority: "High",
      registered: "6 hours ago",
      assignedTo: "Unassigned",
    },
    {
      id: "COMP004",
      farmer: "Deepak Singh",
      prn: "PRN12348",
      crop: "Sugarcane",
      issue: "Crop Disease",
      source: "Satellite Map",
      status: "resolved",
      priority: "High",
      registered: "1 day ago",
      assignedTo: "John Doe",
    },
    {
      id: "COMP005",
      farmer: "Meera Das",
      prn: "PRN12349",
      crop: "Sugarcane",
      issue: "Irrigation Issue",
      source: "Krushik App",
      status: "in_progress",
      priority: "Medium",
      registered: "2 days ago",
      assignedTo: "Jane Smith",
    },
  ];

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.farmer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.crop.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || complaint.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "in_progress":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "resolved":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-red-400 bg-red-500/10";
      case "Medium":
        return "text-yellow-400 bg-yellow-500/10";
      case "Low":
        return "text-green-400 bg-green-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

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
            title={!sidebarOpen ? "Back to Dashboard" : undefined}
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
        <div className="h-16 bg-slate-800/50 backdrop-blur-md border-b border-slate-700/50 flex items-center px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-slate-200 mr-4"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Complaints Management</h1>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Title and Stats */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Complaint System</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <p className="text-slate-400 text-sm mb-1">Total Complaints</p>
                <p className="text-3xl font-bold text-white">{complaints.length}</p>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
                <p className="text-yellow-400 text-sm mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-300">
                  {complaints.filter((c) => c.status === "pending").length}
                </p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                <p className="text-blue-400 text-sm mb-1">In Progress</p>
                <p className="text-3xl font-bold text-blue-300">
                  {complaints.filter((c) => c.status === "in_progress").length}
                </p>
              </div>
              <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/30">
                <p className="text-emerald-400 text-sm mb-1">Resolved</p>
                <p className="text-3xl font-bold text-emerald-300">
                  {complaints.filter((c) => c.status === "resolved").length}
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Search by ID, farmer name, or crop..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-700/30 border-slate-600 text-white placeholder-slate-500 h-11 rounded-lg pl-10"
                  />
                </div>
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-700/30 border border-slate-600 text-white rounded-lg h-11 px-4 cursor-pointer hover:bg-slate-700/40 transition"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Complaints Table */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600/30 bg-slate-700/20">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Farmer
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Crop
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Issue
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Source
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Priority
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                      Assigned To
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((complaint) => (
                    <tr
                      key={complaint.id}
                      className="border-b border-slate-600/20 hover:bg-slate-700/20 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                        {complaint.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {complaint.farmer}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium">
                          {complaint.crop}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {complaint.issue}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {complaint.source}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            complaint.status
                          )}`}
                        >
                          {complaint.status.replace("_", " ").charAt(0).toUpperCase() +
                            complaint.status.slice(1).replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {complaint.assignedTo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredComplaints.length === 0 && (
              <div className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">No complaints found matching your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
