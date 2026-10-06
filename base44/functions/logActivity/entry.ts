import { ok, fail } from "../../shared/response.ts";
import { resolvePrincipal, entity } from "../../shared/principal.ts";
import { logAction } from "../../shared/audit.ts";

// Canonical way to log an activity: the principal is auto-stamped as actor.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const principal = await resolvePrincipal(req, body);
    if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
    const { accountId, entityType, entityId, type, description, metadata } = body;
    if (!accountId || !entityType || !entityId || !type)
      return fail("VALIDATION_ERROR", "accountId, entityType, entityId, type required", 400);
    if (principal.useServiceRole && principal.accountIds !== null && !principal.accountIds.includes(accountId))
      return fail("SCOPE_VIOLATION", "Account not in scope", 403);

    const rec = await entity(principal, "Activity").create({
      account_id: accountId,
      entity_type: entityType,
      entity_id: entityId,
      type,
      description: description || "",
      actor_id: principal.id,
      actor_type: principal.kind,
      actor_name: principal.name,
      metadata: metadata || {}
    });
    await logAction(principal, { action: "log_activity", entity: "Activity", entityId: rec.id, accountId, metadata: { type, entityType, entityId } });
    return ok(rec, 201);
  } catch (e) {
    return fail("INTERNAL", (e && e.message) || "Internal error", 500);
  }
}