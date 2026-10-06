import { ok, fail } from "../../shared/response.ts";
import { resolvePrincipal } from "../../shared/principal.ts";
import { CATALOG } from "../../shared/catalog.ts";

// Capability discovery: returns the machine-readable catalogue of every
// action, so agents can discover and call tools without hardcoding.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const principal = await resolvePrincipal(req, body);
    if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
    return ok(CATALOG);
  } catch (e) {
    return fail("INTERNAL", (e && e.message) || "Internal error", 500);
  }
}