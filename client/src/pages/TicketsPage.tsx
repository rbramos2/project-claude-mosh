import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { Navbar } from "../components/Navbar";
import { useSession } from "../lib/auth-client";

// ---------------------------------------------------------------------------
// Enums & types
// ---------------------------------------------------------------------------

enum TicketStatus {
  open = "open",
  pending = "pending",
  closed = "closed",
}

enum TicketCategory {
  billing = "billing",
  technical = "technical",
  account = "account",
  feature_request = "feature_request",
  general = "general",
}

interface Agent {
  id: string;
  name: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  category: TicketCategory;
  clientEmail: string;
  assignedTo: Agent | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface TicketsResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

interface CurrentUser {
  id: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Styles & labels
// ---------------------------------------------------------------------------

const statusSelectStyles: Record<TicketStatus, string> = {
  [TicketStatus.open]: "bg-green-100 text-green-700 ring-green-200",
  [TicketStatus.pending]: "bg-yellow-100 text-yellow-700 ring-yellow-200",
  [TicketStatus.closed]: "bg-gray-100 text-gray-500 ring-gray-200",
};

const categorySelectStyles: Record<TicketCategory, string> = {
  [TicketCategory.billing]: "bg-purple-100 text-purple-700 ring-purple-200",
  [TicketCategory.technical]: "bg-blue-100 text-blue-700 ring-blue-200",
  [TicketCategory.account]: "bg-teal-100 text-teal-700 ring-teal-200",
  [TicketCategory.feature_request]: "bg-orange-100 text-orange-700 ring-orange-200",
  [TicketCategory.general]: "bg-gray-100 text-gray-500 ring-gray-200",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.billing]: "Billing",
  [TicketCategory.technical]: "Technical",
  [TicketCategory.account]: "Account",
  [TicketCategory.feature_request]: "Feature Request",
  [TicketCategory.general]: "General",
};

const STATUS_FILTERS = [
  { label: "All", value: null },
  { label: "Open", value: TicketStatus.open },
  { label: "Pending", value: TicketStatus.pending },
  { label: "Closed", value: TicketStatus.closed },
] as const;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const api = axios.create({ baseURL: "/api", withCredentials: true });

function apiError(e: unknown): string {
  if (axios.isAxiosError(e)) return e.response?.data?.error ?? e.message;
  return "An unexpected error occurred";
}

// Chevron for custom selects
function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2"
      width="8" height="8" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

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

// ---------------------------------------------------------------------------
// Inline editable cells
// ---------------------------------------------------------------------------

function StatusSelect({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (status: TicketStatus) =>
      api.patch(`/tickets/${ticket.id}`, { status }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  return (
    <div className="relative inline-flex items-center">
      <select
        value={ticket.status}
        disabled={isPending}
        onChange={(e) => mutate(e.target.value as TicketStatus)}
        className={`appearance-none pl-2 pr-5 py-0.5 text-xs font-medium rounded-full cursor-pointer ring-1 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 disabled:opacity-50 transition-opacity ${statusSelectStyles[ticket.status]}`}
      >
        {Object.values(TicketStatus).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <Chevron />
    </div>
  );
}

function CategorySelect({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (category: TicketCategory) =>
      api.patch(`/tickets/${ticket.id}`, { category }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  return (
    <div className="relative inline-flex items-center">
      <select
        value={ticket.category}
        disabled={isPending}
        onChange={(e) => mutate(e.target.value as TicketCategory)}
        className="appearance-none text-sm border border-gray-200 rounded-lg pl-2 pr-5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
      >
        {Object.values(TicketCategory).map((c) => (
          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
        ))}
      </select>
      <Chevron />
    </div>
  );
}

function AssignCell({
  ticket,
  agents,
  currentUser,
}: {
  ticket: Ticket;
  agents: Agent[];
  currentUser: CurrentUser | undefined;
}) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (userId: string | null) =>
      api.patch(`/tickets/${ticket.id}/assign`, { userId }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";
  const assignedToSelf = ticket.assignedTo?.id === currentUser.id;
  const assignedToOther = ticket.assignedTo !== null && !assignedToSelf;

  if (isAdmin) {
    return (
      <select
        value={ticket.assignedTo?.id ?? ""}
        disabled={isPending}
        onChange={(e) => mutate(e.target.value || null)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer max-w-[140px]"
      >
        <option value="">Unassigned</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    );
  }

  if (assignedToOther) return <span className="text-gray-500 text-sm">{ticket.assignedTo!.name}</span>;

  if (assignedToSelf) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
        You
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
    );
  }

  return (
    <button
      disabled={isPending}
      onClick={() => mutate(currentUser.id)}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
          <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
          Assigning…
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          Assign to me
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Debounce
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Column helper (outside component for stable reference shape)
// ---------------------------------------------------------------------------

const col = createColumnHelper<Ticket>();

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TicketsPage() {
  const { data: sessionData } = useSession();
  const currentUser = sessionData?.user as CurrentUser | undefined;

  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "">("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounce(searchInput, 300);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPage(1); }, [statusFilter, categoryFilter, assignedToFilter, search, sorting]);

  const sort = sorting[0];
  const { data, isLoading, error } = useQuery<TicketsResponse>({
    queryKey: ["tickets", sort?.id, sort?.desc, statusFilter, categoryFilter, assignedToFilter, search, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (sort) {
        params.set("sortBy", sort.id);
        params.set("sortOrder", sort.desc ? "desc" : "asc");
      }
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (assignedToFilter) params.set("assignedTo", assignedToFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      return api.get<TicketsResponse>(`/tickets?${params}`).then((r) => r.data);
    },
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: () => api.get<Agent[]>("/agents").then((r) => r.data),
  });

  const columns = useMemo(() => [
    col.accessor("subject", {
      header: "Subject",
      cell: (i) => (
        <Link
          to={`/tickets/${i.row.original.id}`}
          className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
        >
          {i.getValue()}
        </Link>
      ),
    }),
    col.accessor("clientEmail", { header: "From" }),
    col.accessor("status", {
      header: "Status",
      cell: (i) => <StatusSelect ticket={i.row.original} />,
    }),
    col.accessor("category", {
      header: "Category",
      enableSorting: false,
      cell: (i) => <CategorySelect ticket={i.row.original} />,
    }),
    col.accessor((row) => row._count.messages, {
      id: "messages",
      header: "Messages",
      enableSorting: false,
      cell: (i) => <span className="text-gray-500">{i.getValue()}</span>,
    }),
    col.accessor("assignedTo", {
      id: "assignedTo",
      header: "Assigned to",
      enableSorting: false,
      cell: (i) => (
        <AssignCell
          ticket={i.row.original}
          agents={agents}
          currentUser={currentUser}
        />
      ),
    }),
    col.accessor("updatedAt", {
      header: "Last updated",
      cell: (i) => (
        <span className="text-gray-500">{new Date(i.getValue()).toLocaleDateString()}</span>
      ),
    }),
  ], [agents, currentUser]);

  const tickets = data?.tickets ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const table = useReactTable({
    data: tickets,
    columns,
    manualSorting: true,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  const hasFilters = statusFilter !== null || categoryFilter !== "" || assignedToFilter !== "" || search !== "";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="px-6 py-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
          <span className="text-sm text-gray-400">
            {!isLoading && !error && total > 0 && `${from}–${to} of ${total}`}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search subject or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); searchRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {STATUS_FILTERS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                  statusFilter === value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | "")}
            className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All categories</option>
            {Object.values(TicketCategory).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>

          {/* Assigned to filter */}
          <select
            value={assignedToFilter}
            onChange={(e) => setAssignedToFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={() => { setStatusFilter(null); setCategoryFilter(""); setAssignedToFilter(""); setSearchInput(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
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
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className={`h-4 rounded bg-gray-200 animate-pulse ${j === 0 ? "w-48" : j === 2 || j === 3 ? "w-16" : j === 4 ? "w-8" : "w-24"}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-red-600 text-sm">
                    {apiError(error)}
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {hasFilters ? "No tickets match your filters." : "No tickets yet."}
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

          {/* Pagination */}
          {!isLoading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-xs rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="px-2.5 py-1 text-xs rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">‹ Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`el-${i}`} className="px-1 text-xs text-gray-400">…</span>
                    ) : (
                      <button key={p} onClick={() => setPage(p)} className={`min-w-[28px] px-2 py-1 text-xs rounded font-medium ${page === p ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-200"}`}>{p}</button>
                    )
                  )}
                <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="px-2.5 py-1 text-xs rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">Next ›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
