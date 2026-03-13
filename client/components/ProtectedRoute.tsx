import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthProvider";

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: JSX.Element;
  allowedRoles?: Array<"admin" | "employee">;
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!profile || !allowedRoles.includes(profile.role))) {
    return <Navigate to="/" replace />;
  }

  return children;
}
