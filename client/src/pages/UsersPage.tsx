import { Link } from "react-router-dom";

export function UsersPage() {
  return (
    <div className="p-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors mb-6"
      >
        ← Home
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>
    </div>
  );
}
