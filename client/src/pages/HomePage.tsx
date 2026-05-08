import { Navbar } from "../components/Navbar";

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="px-6 py-8">
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <p className="mt-2 text-gray-500">Welcome to Helpdesk.</p>
      </main>
    </div>
  );
}
