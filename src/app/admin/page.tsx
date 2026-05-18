"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AppRole = "SUPERADMIN" | "ADMIN" | "USER";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

type LegacyWedding = {
  id: string;
  name: string;
  ownerId: string | null;
  memberships: Array<{
    id: string;
    role: "owner" | "editor" | "viewer";
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  _count: {
    events: number;
    guests: number;
  };
};

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [legacyWeddings, setLegacyWeddings] = useState<LegacyWedding[]>([]);
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerEmailByWeddingId, setOwnerEmailByWeddingId] = useState<Record<string, string>>({});
  const [newPasswordByUserId, setNewPasswordByUserId] = useState<Record<string, string>>({});
  const [isSavingRoleByUserId, setIsSavingRoleByUserId] = useState<Record<string, boolean>>({});
  const [isSavingPasswordByUserId, setIsSavingPasswordByUserId] = useState<Record<string, boolean>>({});
  const [isAssigningByWeddingId, setIsAssigningByWeddingId] = useState<Record<string, boolean>>({});

  const canManageRoles = currentRole === "SUPERADMIN";

  const fetchAdminData = async () => {
    const [usersResponse, weddingsResponse] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/weddings/legacy", { cache: "no-store" }),
    ]);

    if (usersResponse.status === 403 || weddingsResponse.status === 403) {
      throw new Error("Forbidden. You need ADMIN or SUPERADMIN.");
    }

    if (!usersResponse.ok || !weddingsResponse.ok) {
      throw new Error("Failed to load admin data");
    }

    const usersJson = (await usersResponse.json()) as { users: AdminUser[]; currentRole: AppRole };
    const weddingsJson = (await weddingsResponse.json()) as { weddings: LegacyWedding[] };

    return {
      users: usersJson.users ?? [],
      weddings: weddingsJson.weddings ?? [],
      currentRole: usersJson.currentRole ?? null,
    };
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAdminData();
        if (!active) return;
        setUsers(data.users);
        setLegacyWeddings(data.weddings);
        setCurrentRole(data.currentRole);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load admin data");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const onAssignOwner = async (weddingId: string) => {
    const email = ownerEmailByWeddingId[weddingId]?.trim();
    if (!email) return;

    setIsAssigningByWeddingId((prev) => ({ ...prev, [weddingId]: true }));
    setError(null);

    try {
      const response = await fetch(`/api/admin/weddings/${weddingId}/assign-owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to assign owner");
      }

      setOwnerEmailByWeddingId((prev) => ({ ...prev, [weddingId]: "" }));
      setIsLoading(true);
      const data = await fetchAdminData();
      setUsers(data.users);
      setLegacyWeddings(data.weddings);
      setCurrentRole(data.currentRole);
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Failed to assign owner");
    } finally {
      setIsAssigningByWeddingId((prev) => ({ ...prev, [weddingId]: false }));
    }
  };

  const onUpdateUserRole = async (userId: string, role: AppRole) => {
    if (!canManageRoles) return;

    setIsSavingRoleByUserId((prev) => ({ ...prev, [userId]: true }));
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to update role");
      }

      setIsLoading(true);
      const data = await fetchAdminData();
      setUsers(data.users);
      setLegacyWeddings(data.weddings);
      setCurrentRole(data.currentRole);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update role");
    } finally {
      setIsSavingRoleByUserId((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const onResetUserPassword = async (userId: string) => {
    if (!canManageRoles) return;

    const password = (newPasswordByUserId[userId] ?? "").trim();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSavingPasswordByUserId((prev) => ({ ...prev, [userId]: true }));
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to update password");
      }

      setNewPasswordByUserId((prev) => ({ ...prev, [userId]: "" }));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update password");
    } finally {
      setIsSavingPasswordByUserId((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 bg-zinc-50 p-6">
      <header className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Admin Console</h1>
        <p className="text-sm text-zinc-600">
          App-level roles and legacy wedding owner backfill.
        </p>
        <div className="mt-2 text-xs text-zinc-600">
          Current role: <span className="font-semibold text-zinc-900">{currentRole ?? "unknown"}</span>
        </div>
        <div className="mt-2">
          <Link className="text-sm text-blue-600 hover:underline" href="/weddings">
            Back to weddings
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Legacy Weddings Missing Owner</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Assign an owner by existing account email to unlock wedding access.
        </p>
        {isLoading ? (
          <p className="mt-3 text-sm text-zinc-600">Loading...</p>
        ) : legacyWeddings.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No legacy weddings require backfill.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {legacyWeddings.map((wedding) => (
              <li key={wedding.id} className="rounded-md border border-zinc-200 p-3">
                <p className="text-sm font-semibold text-zinc-900">{wedding.name}</p>
                <p className="text-xs text-zinc-600">
                  {wedding.id} • events: {wedding._count.events} • guests: {wedding._count.guests}
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={ownerEmailByWeddingId[wedding.id] ?? ""}
                    onChange={(event) =>
                      setOwnerEmailByWeddingId((prev) => ({
                        ...prev,
                        [wedding.id]: event.target.value,
                      }))
                    }
                    placeholder="Owner email"
                    className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void onAssignOwner(wedding.id)}
                    disabled={isAssigningByWeddingId[wedding.id] || !(ownerEmailByWeddingId[wedding.id] ?? "").trim()}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {isAssigningByWeddingId[wedding.id] ? "Assigning..." : "Assign owner"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">User App Roles</h2>
        <p className="mt-1 text-sm text-zinc-600">
          `SUPERADMIN` can change app roles. `ADMIN` has access to admin backfill tools.
        </p>
        {isLoading ? (
          <p className="mt-3 text-sm text-zinc-600">Loading...</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {users.map((user) => (
              <li key={user.id} className="flex items-center gap-3 rounded-md border border-zinc-200 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{user.name}</p>
                  <p className="truncate text-xs text-zinc-600">{user.email}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <select
                    value={user.role}
                    onChange={(event) => void onUpdateUserRole(user.id, event.target.value as AppRole)}
                    disabled={!canManageRoles || isSavingRoleByUserId[user.id]}
                    className="h-9 rounded-md border border-zinc-300 px-2 text-sm disabled:opacity-50"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                  </select>
                  <input
                    type="password"
                    value={newPasswordByUserId[user.id] ?? ""}
                    onChange={(event) =>
                      setNewPasswordByUserId((prev) => ({
                        ...prev,
                        [user.id]: event.target.value,
                      }))
                    }
                    placeholder="New password (min 8)"
                    disabled={!canManageRoles || isSavingPasswordByUserId[user.id]}
                    className="h-9 w-52 rounded-md border border-zinc-300 px-3 text-sm disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => void onResetUserPassword(user.id)}
                    disabled={!canManageRoles || isSavingPasswordByUserId[user.id] || (newPasswordByUserId[user.id] ?? "").trim().length < 8}
                    className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {isSavingPasswordByUserId[user.id] ? "Saving..." : "Reset password"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
