import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
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

const userFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").pipe(z.email({ message: "Enter a valid email" })),
  password: z.union([
    z.literal(""),
    z.string().min(8, "Password must be at least 8 characters"),
  ]),
});

type UserForm = z.infer<typeof userFormSchema>;

const api = axios.create({ baseURL: "/api", withCredentials: true });

function apiError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    return e.response?.data?.error ?? e.message;
  }
  return "An unexpected error occurred";
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function UsersPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [modalUser, setModalUser] = useState<User | "new" | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const isEditMode = modalUser !== null && modalUser !== "new";
  const isOpen = modalUser !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserForm>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const {
    data: users = [],
    isLoading,
    error: fetchError,
  } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/users").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: UserForm) =>
      api.post<User>("/users", data).then((r) => r.data),
    onSuccess: (user) => {
      qc.setQueryData<User[]>(["users"], (prev = []) => [...prev, user]);
      closeModal();
    },
    onError: (e) => setModalError(apiError(e)),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserForm }) =>
      api.patch<User>(`/users/${id}`, data).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData<User[]>(["users"], (prev = []) =>
        prev.map((u) => (u.id === updated.id ? updated : u)),
      );
      closeModal();
    },
    onError: (e) => setModalError(apiError(e)),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      api.patch<User>(`/users/${userId}/role`, { role }).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData<User[]>(["users"], (prev = []) =>
        prev.map((u) => (u.id === updated.id ? updated : u)),
      );
      setActionError(null);
    },
    onError: (e) => setActionError(apiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}`),
    onSuccess: (_, userId) => {
      qc.setQueryData<User[]>(["users"], (prev = []) =>
        prev.filter((u) => u.id !== userId),
      );
      setActionError(null);
    },
    onError: (e) => setActionError(apiError(e)),
  });

  const handleDelete = (user: User) => setDeleteConfirm(user);

  const closeModal = () => {
    setModalUser(null);
    setModalError(null);
    reset({ name: "", email: "", password: "" });
  };

  const openEdit = (user: User) => {
    setModalUser(user);
    setModalError(null);
    reset({ name: user.name, email: user.email, password: "" });
  };

  const openCreate = () => {
    setModalUser("new");
    setModalError(null);
    reset({ name: "", email: "", password: "" });
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const onSubmit = (data: UserForm) => {
    if (!isEditMode) {
      if (!data.password) {
        setModalError("Password is required");
        return;
      }
      createMutation.mutate(data);
    } else {
      editMutation.mutate({ id: (modalUser as User).id, data });
    }
  };

  const isPending = createMutation.isPending || editMutation.isPending;
  const currentUserId = session?.user.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="px-6 py-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <button
            onClick={openCreate}
            className="text-sm px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Add User
          </button>
        </div>

        {isOpen && (
          <div
            data-testid="modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-800">
                  {isEditMode ? "Edit User" : "New User"}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                autoComplete="off"
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1">
                  <label htmlFor="user-name" className="text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    id="user-name"
                    type="text"
                    autoFocus
                    {...register("name")}
                    className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="user-email" className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="user-email"
                    type="email"
                    autoComplete="off"
                    {...register("email")}
                    className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="user-password" className="text-sm font-medium text-gray-700">
                    Password
                    {isEditMode && (
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        (leave blank to keep current)
                      </span>
                    )}
                  </label>
                  <input
                    id="user-password"
                    type="password"
                    autoComplete="new-password"
                    {...register("password")}
                    className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
                  />
                  {errors.password && (
                    <p className="text-xs text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {modalError && (
                  <p className="text-sm text-red-600">{modalError}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="text-sm px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isPending}
                    className="text-sm px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors"
                  >
                    {isPending
                      ? isEditMode ? "Saving..." : "Creating..."
                      : isEditMode ? "Save Changes" : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div
            data-testid="delete-modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
          >
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-2">Delete User</h2>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-medium text-gray-900">{deleteConfirm.name}</span>? This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="text-sm px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    deleteMutation.mutate(deleteConfirm.id, {
                      onSuccess: () => setDeleteConfirm(null),
                    });
                  }}
                  className="text-sm px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium transition-colors"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
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
                    <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-44 rounded bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-gray-200 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200 animate-pulse" /></td>
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
                    const isUpdatingRole =
                      roleMutation.isPending && roleMutation.variables?.userId === user.id;
                    const isDeleting =
                      deleteMutation.isPending && deleteMutation.variables === user.id;
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                      >
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
                          <button
                            onClick={() => openEdit(user)}
                            className="inline-flex items-center text-xs px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 transition-colors mr-1"
                            aria-label="Edit user"
                          >
                            <PencilIcon />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDelete(user)}
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
