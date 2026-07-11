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
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-80 transition"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-outline-variant/30">
                <Sprout className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-bold text-on-surface">AI ADT Foundation</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <h1 className="text-7xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-3xl font-bold text-on-surface mb-3">Page Not Found</h2>
          <p className="text-on-surface-variant text-lg mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist. Please check the URL or
            return to the home page.
          </p>
          <Link to="/">
            <Button className="h-12 px-8 text-base font-semibold rounded-xl">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
