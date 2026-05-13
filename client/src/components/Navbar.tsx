import { Link, useNavigate } from "react-router-dom";
import { signOut, useSession } from "../lib/auth-client";

export function Navbar() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="font-semibold text-gray-800 hover:text-gray-600 transition-colors">Helpdesk</Link>
      <div className="flex items-center gap-4">
        <Link
          to="/tickets"
          className="text-sm px-3 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-colors"
        >
          Tickets
        </Link>
        {session?.user.role === "admin" && (
          <Link
            to="/users"
            className="text-sm px-3 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-colors"
          >
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{session?.user.name}</span>
        <button
          onClick={handleSignOut}
          className="text-sm px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
