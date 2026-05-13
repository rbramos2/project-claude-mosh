import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
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

function SortIcon({ asc }: { asc: boolean | undefined }) {
  return (
    <span className="inline-flex flex-col ml-1.5 gap-[1px] translate-y-[0.5px]">
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
        <path d="M4 0L7.5 5H0.5L4 0Z" fill={asc === true ? "#3b82f6" : "#d1d5db"} />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
        <path d="M4 5L0.5 0H7.5L4 5Z" fill={asc === false ? "#3b82f6" : "#d1d5db"} />
      </svg>
    </span>
  );
}

const col = createColumnHelper<Ticket>();

const columns = [
  col.accessor("subject", {
    header: "Subject",
    cell: (i) => (
      <span className="font-medium text-gray-900">{i.getValue()}</span>
    ),
  }),
  col.accessor("clientEmail", { header: "From" }),
  col.accessor("status", {
    header: "Status",
    cell: (i) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[i.getValue()]}`}>
        {i.getValue()}
      </span>
    ),
  }),
  col.accessor((row) => row._count.messages, {
    id: "messages",
    header: "Messages",
    enableSorting: false,
    cell: (i) => <span className="text-gray-500">{i.getValue()}</span>,
  }),
  col.accessor("updatedAt", {
    header: "Last updated",
    cell: (i) => (
      <span className="text-gray-500">{new Date(i.getValue()).toLocaleDateString()}</span>
    ),
  }),
];

export function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);

  const sort = sorting[0];
  const { data: tickets = [], isLoading, error } = useQuery<Ticket[]>({
    queryKey: ["tickets", sort?.id, sort?.desc],
    queryFn: () => {
      const params = sort
        ? `?sortBy=${sort.id}&sortOrder=${sort.desc ? "desc" : "asc"}`
        : "";
      return api.get<Ticket[]>(`/tickets${params}`).then((r) => r.data);
    },
  });

  const table = useReactTable({
    data: tickets,
    columns,
    manualSorting: true,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
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

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {table.getFlatHeaders().map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={`text-left px-4 py-3 font-medium text-gray-600 select-none ${canSort ? "cursor-pointer hover:text-gray-900" : ""}`}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && <SortIcon asc={sorted === false ? undefined : sorted === "asc" ? true : false} />}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3"><div className="h-4 w-48 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-36 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-8 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200 animate-pulse" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-red-600 text-sm">
                    {apiError(error)}
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No tickets yet.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
