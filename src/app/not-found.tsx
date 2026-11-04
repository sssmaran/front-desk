import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page narrow">
      <div className="panel center">
        <p className="code-big">404</p>
        <h1 className="h-page">Page not found</h1>
        <p className="quiet">There's nothing at this address. Check the link, or start from the visit list.</p>
        <p><Link href="/visits">Go to visits</Link></p>
      </div>
    </div>
  );
}
