import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sprout } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 backdrop-blur-md bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">KVK Digital</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <h1 className="text-7xl font-bold text-emerald-400 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-white mb-3">Page Not Found</h2>
          <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist. Please check the URL or return to the home page.
          </p>
          <Link to="/">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8 text-base font-semibold rounded-lg">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
