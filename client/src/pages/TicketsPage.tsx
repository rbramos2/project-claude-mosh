import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "../components/Navbar";

enum TicketStatus {
  open = "open",
  closed = "closed",
  pending = "pending",
}

interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  clientEmail: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

const api = axios.create({ baseURL: "/api", withCredentials: true });

function apiError(e: unknown): string {
  if (axios.isAxiosError(e)) return e.response?.data?.error ?? e.message;
  return "An unexpected error occurred";
}

const statusStyles: Record<TicketStatus, string> = {
  [TicketStatus.open]: "bg-green-100 text-green-700",
  [TicketStatus.pending]: "bg-yellow-100 text-yellow-700",
  [TicketStatus.closed]: "bg-gray-100 text-gray-500",
};

export function TicketsPage() {
  const { data: tickets = [], isLoading, error } = useQuery<Ticket[]>({
    queryKey: ["tickets"],
    queryFn: () => api.get<Ticket[]>("/tickets").then((r) => r.data),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="px-6 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
          <span className="text-sm text-gray-400">
            {!isLoading && !error && `${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">From</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Messages</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3"><div className="h-4 w-48 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-36 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-8 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200 animate-pulse" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{apiError(error)}</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">From</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Messages</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No tickets yet.
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                        {ticket.subject}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ticket.clientEmail}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[ticket.status]}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-center">
                        {ticket._count.messages}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(ticket.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
