import { Navigate } from "react-router-dom";
import { useAppUser } from "@/lib/useAppUser";

// Route guard for the /admin console. Blocks any non-admin user from
// loading the admin UI, redirecting them to the home page. This is
// defense-in-depth on top of the RLS that blocks non-admin writes.
export default function AdminRoute({ children }) {
  const { user, loading } = useAppUser();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.app_role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}