"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { RequireAuth, useOnUnauthorized, type Me } from "@/components/auth";
import { ErrorBox, NoAccess } from "@/components/states";

interface AllowedUser {
  email: string;
  name: string;
  role: "admin" | "viewer";
  signedUp: boolean;
}

function UsersView() {
  const onUnauthorized = useOnUnauthorized();
  const [users, setUsers] = useState<AllowedUser[] | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    api<{ users: AllowedUser[] }>("/api/admin/users").then((res) => {
      if (res.status === 401) return onUnauthorized();
      if (res.error) setError({ status: res.status, message: res.error });
      else setUsers(res.data!.users);
    });
  }, [onUnauthorized]);

  if (error?.status === 403) return <NoAccess />;
  const joined = users?.filter((u) => u.signedUp).length ?? 0;

  return (
    <div className="page">
      <header className="pagehead">
        <h1 className="h-page">People with access</h1>
        <p className="quiet">
          Only these people can create an account. Admins see visitor names; viewers see counts only.
          {users && ` ${joined} of ${users.length} have signed up.`}
        </p>
      </header>
      {error && <ErrorBox message={error.message} />}
      {!users && !error && <p className="quiet pad">Loading…</p>}
      {users && (
        <section aria-label="People with access">
          <p className="table-hint">Scroll horizontally to see all account details.</p>
          <div className="tablewrap" tabIndex={0} role="region" aria-label="Account details table">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Account</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email}>
                    <td>{u.name}</td>
                    <td className="mono small">{u.email}</td>
                    <td><span className={`role role-${u.role}`}>{u.role === "admin" ? "Admin" : "Viewer"}</span></td>
                    <td>{u.signedUp ? <span className="ok">Signed up</span> : <span className="quiet">Not yet</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RequireAuth>
      {(me: Me) => (me.canManageUsers ? <UsersView /> : <NoAccess />)}
    </RequireAuth>
  );
}
