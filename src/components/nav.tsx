"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth";
import { AccountMenu } from "./ui/AccountMenu";
import { useLastVisitsHref } from "@/lib/client/lastVisits";

export function Nav() {
  const { me, signOut, signOutError } = useAuth();
  const path = usePathname();
  const visitsHref = useLastVisitsHref(); // returns to the last filtered list in this tab
  const link = (section: string, href: string, label: string) => (
    <Link href={href} className={path.startsWith(section) ? "navlink active" : "navlink"} aria-current={path.startsWith(section) ? "page" : undefined}>
      {label}
    </Link>
  );
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href={me ? visitsHref : "/login"} className="brand">
          <span className="brand-rule" aria-hidden />
          The Front Desk
        </Link>
        {me && (
          <div className="topbar-right">
            <nav className="navlinks" aria-label="Main">
              {link("/visits", visitsHref, "Visits")}
              {/* Viewers aren't offered a link that would only refuse them. */}
              {me.canManageUsers && link("/admin/users", "/admin/users", "People with access")}
            </nav>
            <span className="topbar-divider" aria-hidden />
            <AccountMenu me={me} onSignOut={signOut} />
          </div>
        )}
      </div>
      {signOutError && <div className="errorbox signout-error" role="alert">{signOutError}</div>}
    </header>
  );
}
