import Link from "next/link";

export function Notices({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="notice" role="note">
      {items.map((n) => <p key={n}>{n}</p>)}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="errorbox" role="alert">{message}</div>;
}

export function NoAccess() {
  return (
    <div className="page narrow">
      <div className="panel center">
        <h1 className="h-page">You don't have access to this page</h1>
        <p className="quiet">This page is for admins. You can still see how busy the lobby is.</p>
        <p><Link href="/visits">Go to visits</Link></p>
      </div>
    </div>
  );
}
