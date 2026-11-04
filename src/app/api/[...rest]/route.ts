import { error } from "@/lib/server/http";

// Unknown /api/* paths get a JSON 404, not an HTML page.
const notFound = () => error(404, "No such API endpoint. See README for the list.");
export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE };
