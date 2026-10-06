import { ok, fail } from "../../shared/response.ts";
import { resolvePrincipal, scopedGet, entity } from "../../shared/principal.ts";
import { logAction, emitEvent } from "../../shared/audit.ts";

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const principal = await resolvePrincipal(req, body);
    if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
    if (principal.role === "client") return fail("FORBIDDEN", "Clients have read-only access", 403);
    const { dealId, name } = body;
    if (!dealId) return fail("VALIDATION_ERROR", "dealId required", 400);

    const deal = await scopedGet(principal, "Deal", dealId);
    if (!deal) return fail("NOT_FOUND", "Deal not found", 404);
    const project = await entity(principal, "Project").create({
      account_id: deal.account_id,
      deal_id: deal.id,
      name: name || `${deal.title} — Project`,
      status: "planning",
      owner_id: deal.owner_id || null
    });
    await logAction(principal, { action: "create_project_from_deal", entity: "Project", entityId: project.id, accountId: deal.account_id, metadata: { deal_id: deal.id } });
    emitEvent(principal, { type: "project_created", entity: "Project", entityId: project.id, accountId: deal.account_id, payload: { deal_id: deal.id } });
    return ok({ project }, 201);
  } catch (e) {
    return fail("INTERNAL", (e && e.message) || "Internal error", 500);
  }
}