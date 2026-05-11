import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios, { AxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "../components/Navbar";
import { useSession } from "../lib/auth-client";

type Role = "admin" | "agent";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "agent"]),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

const api = axios.create({ baseURL: "/api", withCredentials: true });

function apiError(e: unknown): string {
  if (e instanceof AxiosError) {
    return e.response?.data?.error ?? e.message;
  }
  return "An unexpected error occurred";
}

export function UsersPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "agent" },
  });

  const { data: users = [], isLoading, error: fetchError } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/users").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserForm) =>
      api.post<User>("/users", data).then((r) => r.data),
    onSuccess: (user) => {
      qc.setQueryData<User[]>(["users"], (prev = []) => [...prev, user]);
      setShowForm(false);
      reset();
      setCreateError(null);
    },
    onError: (e) => setCreateError(apiError(e)),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      api.patch<User>(`/users/${userId}/role`, { role }).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData<User[]>(["users"], (prev = []) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );
      setActionError(null);
    },
    onError: (e) => setActionError(apiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}`),
    onSuccess: (_, userId) => {
      qc.setQueryData<User[]>(["users"], (prev = []) =>
        prev.filter((u) => u.id !== userId)
      );
      setActionError(null);
    },
    onError: (e) => setActionError(apiError(e)),
  });

  const handleDelete = (userId: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    deleteMutation.mutate(userId);
  };

  const currentUserId = session?.user.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="px-6 py-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setCreateError(null);
              reset();
            }}
            className="text-sm px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            {showForm ? "Cancel" : "Add User"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-4">New User</h2>
            <form
              onSubmit={handleSubmit((data) => createMutation.mutate(data))}
              noValidate
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="new-user-name" className="text-sm font-medium text-gray-700">Name</label>
                <input
                  id="new-user-name"
                  type="text"
                  {...register("name")}
                  className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="new-user-email" className="text-sm font-medium text-gray-700">Email</label>
                <input
                  id="new-user-email"
                  type="email"
                  {...register("email")}
                  className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="new-user-password" className="text-sm font-medium text-gray-700">Password</label>
                <input
                  id="new-user-password"
                  type="password"
                  {...register("password")}
                  className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
                />
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="new-user-role" className="text-sm font-medium text-gray-700">Role</label>
                <select
                  id="new-user-role"
                  {...register("role")}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {createError && (
                <p className="sm:col-span-2 text-sm text-red-600">{createError}</p>
              )}

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending}
                  className="text-sm px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors"
                >
                  {createMutation.isPending ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        )}

        {actionError && (
          <p className="text-sm text-red-600 mb-4">{actionError}</p>
        )}

        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-44 rounded bg-gray-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-14 rounded-full bg-gray-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : fetchError ? (
          <p className="text-sm text-red-600">{apiError(fetchError)}</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const isUpdatingRole = roleMutation.isPending && roleMutation.variables?.userId === user.id;
                    const isDeleting = deleteMutation.isPending && deleteMutation.variables === user.id;
                    return (
                      <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {user.name}
                          {isSelf && (
                            <span className="ml-2 text-xs text-gray-400">(you)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3">
                          {isSelf ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                              {user.role}
                            </span>
                          ) : (
                            <select
                              value={user.role}
                              disabled={isUpdatingRole}
                              onChange={(e) =>
                                roleMutation.mutate({ userId: user.id, role: e.target.value as Role })
                              }
                              className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${user.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                            >
                              <option value="agent">agent</option>
                              <option value="admin">admin</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isSelf && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={isDeleting}
                              className="text-xs px-2 py-1 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
