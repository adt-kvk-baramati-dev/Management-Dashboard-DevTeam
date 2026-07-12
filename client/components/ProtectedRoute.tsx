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

  const profileRole = profile?.role as "admin" | "employee" | undefined;
  const resolvedRole: "admin" | "employee" | null =
    profileRole ??
    (user?.role === "admin" || user?.role === "employee" ? user.role : null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && resolvedRole && !allowedRoles.includes(resolvedRole)) {
    const fallback =
      resolvedRole === "admin" ? "/admin/dashboard" : "/employee/dashboard";
    return <Navigate to={fallback} replace />;
  }

  // If a role is required but we couldn't resolve it, force a clean login.
  if (allowedRoles && !resolvedRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
