import { useNavigate } from "react-router-dom";
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
      <span className="font-semibold text-gray-800">Helpdesk</span>
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
