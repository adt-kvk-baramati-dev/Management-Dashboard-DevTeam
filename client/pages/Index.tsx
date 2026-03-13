import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  MapPin,
  Users,
  AlertCircle,
  Sprout,
  Zap,
  Shield,
  TrendingUp,
} from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 backdrop-blur-md bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">KVK Digital</span>
            </div>
            <div className="flex gap-4">
              <Link to="/login">
                <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                Agricultural Intelligence Command Center
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                KVK Digital Intelligence platform modernizes agricultural advisory support,
                transforming Krishi Vigyan Kendra operations with real-time data, precision
                farming insights, and complaint management.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/admin/dashboard">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8 text-base font-semibold rounded-lg">
                  Admin Dashboard
                </Button>
              </Link>
              <Link to="/employee/dashboard">
                <Button
                  variant="outline"
                  className="border-indigo-400 text-indigo-300 hover:bg-indigo-500/10 h-12 px-8 text-base font-semibold rounded-lg"
                >
                  Employee Dashboard
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8">
              <div>
                <div className="text-3xl font-bold text-emerald-400">10K+</div>
                <p className="text-sm text-slate-400">Farmers Registered</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-indigo-400">500+</div>
                <p className="text-sm text-slate-400">Monthly Complaints</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-300">98%</div>
                <p className="text-sm text-slate-400">Resolution Rate</p>
              </div>
            </div>
          </div>

          {/* Hero Illustration */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-indigo-400/20 rounded-2xl blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8 backdrop-blur-md">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">Real-time Analytics</p>
                    <p className="text-xs text-slate-500">Monitor operations live</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">GIS Mapping</p>
                    <p className="text-xs text-slate-500">Location-based insights</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <AlertCircle className="w-5 h-5 text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">Smart Routing</p>
                    <p className="text-xs text-slate-500">Auto-assign complaints</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-slate-700/50 bg-slate-800/30 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Comprehensive Agricultural Management
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              All tools needed to manage farming operations, from complaint management
              to precision agriculture monitoring
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-300 backdrop-blur-sm">
                <Users className="w-12 h-12 text-emerald-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Farmer Database</h3>
                <p className="text-slate-400">
                  Comprehensive farmer registry with detailed profiles, crop information,
                  and contact details
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-300 backdrop-blur-sm">
                <AlertCircle className="w-12 h-12 text-indigo-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Complaint Management</h3>
                <p className="text-slate-400">
                  Multi-channel complaint intake with smart routing, automated classification,
                  and status tracking
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-300 backdrop-blur-sm">
                <MapPin className="w-12 h-12 text-emerald-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">GIS Mapping</h3>
                <p className="text-slate-400">
                  Interactive maps for farmer distribution, field locations, and
                  outreach programme coverage
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-300 backdrop-blur-sm">
                <TrendingUp className="w-12 h-12 text-indigo-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Analytics Dashboard</h3>
                <p className="text-slate-400">
                  Real-time analytics with district-wise, taluka-wise, and crop-wise
                  farmer statistics
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-300 backdrop-blur-sm">
                <Sprout className="w-12 h-12 text-emerald-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Precision Agriculture</h3>
                <p className="text-slate-400">
                  NDVI, EVI, and water stress monitoring with satellite data verification
                  through ground sampling
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-300 backdrop-blur-sm">
                <Shield className="w-12 h-12 text-indigo-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Role-Based Access</h3>
                <p className="text-slate-400">
                  Admin, Employee, and Domain Expert roles with customizable permissions
                  and field activities
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Module Capabilities
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Specialized tools for managing every aspect of KVK operations
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Field Operations</h3>
            </div>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                <span>Field visit logging and documentation</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                <span>Employee activity tracking</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                <span>Random sampling and data collection</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                <span>Photo and evidence documentation</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700 rounded-xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Complaint Workflows</h3>
            </div>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-indigo-400 mt-1">✓</span>
                <span>Multi-channel complaint intake (App, IoT, Satellite)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-400 mt-1">✓</span>
                <span>Smart auto-classification and routing</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-400 mt-1">✓</span>
                <span>Timeline tracking and status updates</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-400 mt-1">✓</span>
                <span>Domain expert assignment and resolution</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="border-t border-slate-700/50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Transform Your Operations?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Access the KVK Digital Intelligence platform to manage all aspects of
            agricultural advisory support and farmer engagement
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/admin/dashboard">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8 text-base font-semibold rounded-lg">
                Admin Access
              </Button>
            </Link>
            <Link to="/employee/dashboard">
              <Button
                variant="outline"
                className="border-indigo-400 text-indigo-300 hover:bg-indigo-500/10 h-12 px-8 text-base font-semibold rounded-lg"
              >
                Employee Access
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">KVK Digital Intelligence</span>
            </div>
            <p className="text-slate-400 text-sm">
              Agricultural Command Center for Krishi Vigyan Kendra
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
