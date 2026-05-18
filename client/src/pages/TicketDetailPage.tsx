import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "../components/Navbar";
import { useSession } from "../lib/auth-client";

enum TicketStatus {
  open = "open",
  closed = "closed",
  pending = "pending",
}

enum TicketCategory {
  billing = "billing",
  technical = "technical",
  account = "account",
  feature_request = "feature_request",
  general = "general",
}

enum MessageDirection {
  inbound = "inbound",
  outbound = "outbound",
}

enum SenderType {
  agent = "agent",
  customer = "customer",
}

interface Agent {
  id: string;
  name: string;
}

interface Message {
  id: string;
  body: string;
  sender: string;
  senderType: SenderType;
  direction: MessageDirection;
  createdAt: string;
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
  messages: Message[];
}

const api = axios.create({ baseURL: "/api", withCredentials: true });

function apiError(e: unknown): string {
  if (axios.isAxiosError(e)) return e.response?.data?.error ?? e.message;
  return "An unexpected error occurred";
}

const statusSelectStyles: Record<TicketStatus, string> = {
  [TicketStatus.open]: "bg-green-100 text-green-700 ring-green-200",
  [TicketStatus.pending]: "bg-yellow-100 text-yellow-700 ring-yellow-200",
  [TicketStatus.closed]: "bg-gray-100 text-gray-500 ring-gray-200",
};

const categorySelectStyles: Record<TicketCategory, string> = {
  [TicketCategory.billing]: "bg-purple-100 text-purple-700 ring-purple-200",
  [TicketCategory.technical]: "bg-blue-100 text-blue-700 ring-blue-200",
  [TicketCategory.account]: "bg-orange-100 text-orange-700 ring-orange-200",
  [TicketCategory.feature_request]: "bg-pink-100 text-pink-700 ring-pink-200",
  [TicketCategory.general]: "bg-gray-100 text-gray-600 ring-gray-200",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.billing]: "Billing",
  [TicketCategory.technical]: "Technical",
  [TicketCategory.account]: "Account",
  [TicketCategory.feature_request]: "Feature Request",
  [TicketCategory.general]: "General",
};

function Chevron() {
  return (
    <svg
      width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      className="pointer-events-none shrink-0 opacity-60"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function StatusSelect({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (status: TicketStatus) =>
      api.patch(`/tickets/${ticket.id}`, { status }).then((r) => r.data),
    onSuccess: (updated: { id: string; status: TicketStatus }) => {
      queryClient.setQueryData<Ticket>(["ticket", ticket.id], (old) =>
        old ? { ...old, status: updated.status } : old
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  return (
    <div className="relative inline-flex items-center">
      <select
        value={ticket.status}
        disabled={isPending}
        onChange={(e) => mutate(e.target.value as TicketStatus)}
        className={`appearance-none pl-2.5 pr-6 py-1 text-xs font-medium rounded-full ring-1 ring-inset cursor-pointer disabled:opacity-50 ${statusSelectStyles[ticket.status]}`}
      >
        {Object.values(TicketStatus).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
        <Chevron />
      </span>
    </div>
  );
}

function CategorySelect({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (category: TicketCategory) =>
      api.patch(`/tickets/${ticket.id}`, { category }).then((r) => r.data),
    onSuccess: (updated: { id: string; category: TicketCategory }) => {
      queryClient.setQueryData<Ticket>(["ticket", ticket.id], (old) =>
        old ? { ...old, category: updated.category } : old
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  return (
    <div className="relative inline-flex items-center">
      <select
        value={ticket.category}
        disabled={isPending}
        onChange={(e) => mutate(e.target.value as TicketCategory)}
        className={`appearance-none pl-2.5 pr-6 py-1 text-xs font-medium rounded-full ring-1 ring-inset cursor-pointer disabled:opacity-50 ${categorySelectStyles[ticket.category]}`}
      >
        {Object.values(TicketCategory).map((c) => (
          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
        <Chevron />
      </span>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AssignSelect({ ticket, agents }: { ticket: Ticket; agents: Agent[] }) {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const currentUser = sessionData?.user as { id: string; role: string } | undefined;

  const { mutate, isPending } = useMutation({
    mutationFn: (userId: string | null) =>
      api.patch(`/tickets/${ticket.id}/assign`, { userId }).then((r) => r.data),
    onSuccess: (updated: { assignedTo: Agent | null }) => {
      queryClient.setQueryData<Ticket>(["ticket", ticket.id], (old) =>
        old ? { ...old, assignedTo: updated.assignedTo } : old
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
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
        className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
      >
        <option value="">Unassigned</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    );
  }

  if (assignedToOther) {
    return <span className="text-sm text-gray-700 font-medium">{ticket.assignedTo!.name}</span>;
  }

  if (assignedToSelf) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 font-medium">
        You
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
    );
  }

  return (
    <button
      disabled={isPending}
      onClick={() => mutate(currentUser.id)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
          Assigning…
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          Assign to me
        </>
      )}
    </button>
  );
}

function ReplyForm({ ticketId }: { ticketId: string }) {
  const [body, setBody] = useState("");
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: (body: string) =>
      api.post<Message>(`/tickets/${ticketId}/messages`, { body }).then((r) => r.data),
    onSuccess: (message) => {
      queryClient.setQueryData<Ticket>(["ticket", ticketId], (old) =>
        old ? { ...old, messages: [...old.messages, message] } : old
      );
      setBody("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim()) mutate(body.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply…"
          rows={4}
          className="w-full px-4 pt-3 pb-2 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none"
        />
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50">
          {error ? (
            <p className="text-xs text-red-600">{apiError(error)}</p>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                Sending…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                Send reply
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: ticket, isLoading, error } = useQuery<Ticket>({
    queryKey: ["ticket", id],
    queryFn: () => api.get<Ticket>(`/tickets/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: () => api.get<Agent[]>("/agents").then((r) => r.data),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="px-6 py-8 max-w-3xl mx-auto">
        <button
          onClick={() => navigate("/tickets")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 group"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="m15 18-6-6 6-6" />
          </svg>
          All tickets
        </button>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-7 w-2/3 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-1/3 rounded bg-gray-200 animate-pulse" />
          </div>
        ) : error ? (
          <p className="text-red-600 text-sm">{apiError(error)}</p>
        ) : ticket ? (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-gray-900 leading-snug mb-3">
                {ticket.subject}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-3">
                <span>From <span className="text-gray-700 font-medium">{ticket.clientEmail}</span></span>
                <span>·</span>
                <span>Opened {formatDate(ticket.createdAt)}</span>
                <span>·</span>
                <span>{ticket.messages.length} message{ticket.messages.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Status</span>
                  <StatusSelect ticket={ticket} />
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Category</span>
                  <CategorySelect ticket={ticket} />
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Assigned to</span>
                  <AssignSelect ticket={ticket} agents={agents} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {ticket.messages.map((msg) => {
                const isAgent = msg.senderType === SenderType.agent;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      isAgent
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                    }`}>
                      <div className={`flex items-center gap-1.5 mb-1`}>
                        <p className={`text-xs font-medium ${isAgent ? "text-blue-200" : "text-gray-400"}`}>
                          {msg.sender}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          isAgent
                            ? "bg-blue-500 text-blue-100"
                            : "bg-gray-100 text-gray-400"
                        }`}>
                          {isAgent ? "agent" : "customer"}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                      <p className={`text-xs mt-2 ${isAgent ? "text-blue-300" : "text-gray-400"}`}>
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <ReplyForm ticketId={ticket.id} />
          </>
        ) : null}
      </main>
    </div>
  );
}
