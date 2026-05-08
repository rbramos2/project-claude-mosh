import { Navigate } from "react-router-dom";
import { useSession } from "../lib/auth-client";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
