import { ok, fail } from "../../shared/response.ts";
import { resolvePrincipal, applyScope, entity } from "../../shared/principal.ts";

// Read-only query of the audit log, scoped by account. Clients cannot read it.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const principal = await resolvePrincipal(req, body);
    if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
    if (principal.role === "client") return fail("FORBIDDEN", "Clients cannot read audit logs", 403);
    const E = entity(principal, "AuditLog");
    const filter = applyScope(principal, body.filter || {}, "account_id");
    const items = await E.filter(filter, body.sort || "-created_date", Math.min(body.pageSize || 50, 200));
    return ok({ items });
  } catch (e) {
    return fail("INTERNAL", (e && e.message) || "Internal error", 500);
  }
}