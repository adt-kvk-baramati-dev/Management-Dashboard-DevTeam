import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sun, Moon, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";

export default function NavBar() {
  const { profile, loading, signOut } = useAuth();
  const location = useLocation();
  const pathname = location.pathname || "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  if (pathname.startsWith("/login") || pathname.startsWith("/portal/login")) {
    return null;
  }

  // Show navbar only after authentication.
  if (loading || !profile) {
    return null;
  }

  const isActive = (href: string) => pathname === href;

  const toggleMobile = () => setMobileOpen((v) => !v);

  return (
    <nav className="navbar flex items-center justify-between px-6 py-3 glass-panel relative">
      <Link to="/" className="text-xl font-bold text-slate-900">
        KVK Portal
      </Link>
      <button
        onClick={toggleMobile}
        className="md:hidden p-2 rounded-md focus:outline-none"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
      <div
        className={`${mobileOpen ? "flex" : "hidden"} flex-col md:flex-row md:flex items-center gap-4 absolute md:static top-full left-0 w-full md:w-auto bg-surface md:bg-transparent p-4 md:p-0 shadow-md md:shadow-none`}
      >
        <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
          Home
        </Link>
        <Link to="/data" className={`nav-link ${isActive("/data") ? "active" : ""}`}>
          Data
        </Link>
        <Link to="/guidance" className={`nav-link ${isActive("/guidance") ? "active" : ""}`}>
          Guidance
        </Link>
        <Link to="/sampling" className={`nav-link ${isActive("/sampling") ? "active" : ""}`}>
          Sampling
        </Link>
        <Link to="/upload" className={`nav-link ${isActive("/upload") ? "active" : ""}`}>
          Upload
        </Link>
        <Link to="/contact" className={`nav-link ${isActive("/contact") ? "active" : ""}`}>
          Contact
        </Link>
        {!loading && profile ? (
          <button
            onClick={handleLogout}
            className="nav-link flex items-center"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </button>
        ) : (
          <Link to="/login" className="nav-link">
            Login
          </Link>
        )}
        <button
          onClick={toggleTheme}
          className="theme-toggle ml-2 p-1 rounded-full"
          aria-label="Toggle color theme"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </div>
    </nav>
  );
}
