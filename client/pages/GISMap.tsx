import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Layers,
  Menu,
  LogOut,
  ArrowLeft,
  Sprout,
  Eye,
  EyeOff,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GISMap() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [visibleLayers, setVisibleLayers] = useState({
    farmers: true,
    complaints: true,
    programs: true,
    sampling: true,
  });

  const toggleLayer = (layer: keyof typeof visibleLayers) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-72" : "w-20"
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

        {/* Map Layers Control */}
        {sidebarOpen && (
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Map Layers
            </h3>
            <div className="space-y-3">
              {[
                { key: "farmers", label: "Farmers", color: "emerald" },
                { key: "complaints", label: "Complaints", color: "red" },
                { key: "programs", label: "Outreach Programs", color: "indigo" },
                { key: "sampling", label: "Sampling Locations", color: "yellow" },
              ].map((layer) => (
                <button
                  key={layer.key}
                  onClick={() => toggleLayer(layer.key as keyof typeof visibleLayers)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full bg-${layer.color}-500`}
                    ></div>
                    <span className="text-slate-300 text-sm">{layer.label}</span>
                  </div>
                  {visibleLayers[layer.key as keyof typeof visibleLayers] ? (
                    <Eye className="w-4 h-4 text-slate-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info Panel */}
        {sidebarOpen && (
          <div className="p-4 space-y-4">
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
              <h4 className="text-slate-300 font-semibold text-sm mb-3">Statistics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Farmers</span>
                  <span className="text-emerald-400 font-semibold">10,234</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Active Complaints</span>
                  <span className="text-red-400 font-semibold">87</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Programs Conducted</span>
                  <span className="text-indigo-400 font-semibold">34</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Sampling Points</span>
                  <span className="text-yellow-400 font-semibold">289</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
              <h4 className="text-slate-300 font-semibold text-sm mb-3">District Filter</h4>
              <select className="w-full bg-slate-700/30 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-700/40 transition">
                <option value="">All Districts</option>
                <option value="ahmednagar">Ahmednagar</option>
                <option value="nashik">Nashik</option>
                <option value="pune">Pune</option>
                <option value="solapur">Solapur</option>
              </select>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800/50 hover:text-emerald-400 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Back to Dashboard</span>}
          </Link>
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

      {/* Main Map Area */}
      <div className={`${sidebarOpen ? "ml-72" : "ml-20"} flex-1 transition-all duration-300 flex flex-col`}>
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
              <MapPin className="w-6 h-6 text-emerald-400" />
              GIS-Based Location Mapping
            </h1>
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full h-full bg-gradient-to-br from-slate-800/50 to-slate-900/30 border-2 border-slate-700/50 rounded-2xl backdrop-blur-sm flex flex-col items-center justify-center overflow-hidden relative">
            {/* Map Placeholder */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-700/20 to-slate-900/50 flex flex-col items-center justify-center gap-6">
              {/* Map Grid Background */}
              <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full" style={{
                  backgroundImage: 'linear-gradient(90deg, #64748b 1px, transparent 1px), linear-gradient(#64748b 1px, transparent 1px)',
                  backgroundSize: '50px 50px'
                }}></div>
              </div>

              {/* Placeholder Markers */}
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Farmer Markers */}
                <div className="absolute" style={{ top: '20%', left: '25%' }}>
                  {visibleLayers.farmers && (
                    <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-emerald-300 shadow-lg shadow-emerald-500/50 animate-pulse"></div>
                  )}
                </div>
                <div className="absolute" style={{ top: '35%', left: '40%' }}>
                  {visibleLayers.farmers && (
                    <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-emerald-300 shadow-lg shadow-emerald-500/50 animate-pulse"></div>
                  )}
                </div>

                {/* Complaint Markers */}
                <div className="absolute" style={{ top: '45%', left: '55%' }}>
                  {visibleLayers.complaints && (
                    <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-red-300 shadow-lg shadow-red-500/50 animate-pulse"></div>
                  )}
                </div>

                {/* Program Markers */}
                <div className="absolute" style={{ top: '60%', left: '45%' }}>
                  {visibleLayers.programs && (
                    <div className="w-5 h-5 bg-indigo-500 rounded-full border-2 border-indigo-300 shadow-lg shadow-indigo-500/50"></div>
                  )}
                </div>

                {/* Sampling Markers */}
                <div className="absolute" style={{ top: '70%', left: '65%' }}>
                  {visibleLayers.sampling && (
                    <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-yellow-300 shadow-lg shadow-yellow-500/50"></div>
                  )}
                </div>
              </div>

              {/* Text Overlay */}
              <div className="relative z-10 text-center">
                <MapPin className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
                <h2 className="text-2xl font-bold text-slate-400 mb-2">GIS Map Visualization</h2>
                <p className="text-slate-500 max-w-md">
                  Interactive map showing farmer locations, complaints, outreach programs, and sampling points
                </p>
                <div className="mt-6 flex gap-4 justify-center">
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-2">
                    <Maximize2 className="w-4 h-4" />
                    Fullscreen
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 rounded-lg"
                  >
                    Reset View
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="px-8 py-4 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          <div className="grid grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-emerald-300"></div>
              <span className="text-slate-300 text-sm">Farmers (10,234)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-red-300"></div>
              <span className="text-slate-300 text-sm">Active Complaints (87)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-indigo-500 rounded-full border-2 border-indigo-300"></div>
              <span className="text-slate-300 text-sm">Outreach Programs (34)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-yellow-300"></div>
              <span className="text-slate-300 text-sm">Sampling Points (289)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
