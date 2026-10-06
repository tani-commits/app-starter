import { ok, fail } from "../../shared/response.ts";
import { resolvePrincipal, scopedGet, entity } from "../../shared/principal.ts";
import { logAction, emitEvent } from "../../shared/audit.ts";

const STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"];

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const principal = await resolvePrincipal(req, body);
    if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
    if (principal.role === "client") return fail("FORBIDDEN", "Clients have read-only access", 403);
    const { dealId, stage } = body;
    if (!dealId || !stage) return fail("VALIDATION_ERROR", "dealId and stage required", 400);
    if (!STAGES.includes(stage)) return fail("VALIDATION_ERROR", "Invalid stage", 400);

    const deal = await scopedGet(principal, "Deal", dealId);
    if (!deal) return fail("NOT_FOUND", "Deal not found", 404);
    if (deal.stage === stage) return ok({ deal, unchanged: true });

    const updated = await entity(principal, "Deal").update(dealId, {
      stage,
      probability: stage === "won" ? 100 : stage === "lost" ? 0 : deal.probability
    });
    await logAction(principal, { action: "move_deal_stage", entity: "Deal", entityId: dealId, accountId: deal.account_id, metadata: { from: deal.stage, to: stage } });
    emitEvent(principal, { type: "deal_stage_changed", entity: "Deal", entityId: dealId, accountId: deal.account_id, payload: { from: deal.stage, to: stage } });
    if (stage === "won") emitEvent(principal, { type: "deal_won", entity: "Deal", entityId: dealId, accountId: deal.account_id, payload: {} });
    return ok({ deal: updated, from: deal.stage, to: stage });
  } catch (e) {
    return fail("INTERNAL", (e && e.message) || "Internal error", 500);
  }
}