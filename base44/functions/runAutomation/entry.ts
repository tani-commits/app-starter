import { ok, fail } from "../../shared/response.ts";
import { resolvePrincipal, scopedGet } from "../../shared/principal.ts";
import { logAction } from "../../shared/audit.ts";
import { createApproval, approvalResponse } from "../../shared/approval.ts";

// Running an automation is a write-bearing action, so it routes to the
// human-approval queue rather than executing silently.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const principal = await resolvePrincipal(req, body);
    if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
    if (principal.role === "client") return fail("FORBIDDEN", "Clients have read-only access", 403);
    const { automationId } = body;
    if (!automationId) return fail("VALIDATION_ERROR", "automationId required", 400);

    const auto = await scopedGet(principal, "Automation", automationId);
    if (!auto) return fail("NOT_FOUND", "Automation not found", 404);
    if (auto.status !== "active") return fail("VALIDATION_ERROR", "Automation is not active", 400);

    const appr = await createApproval(principal, {
      actionType: "runAutomation",
      payload: { automationId: auto.id, accountId: auto.account_id },
      accountId: auto.account_id,
      summary: `Run automation: ${auto.name}`
    });
    await logAction(principal, { action: "run_automation_requested", entity: "Automation", entityId: auto.id, accountId: auto.account_id, status: "pending_approval", metadata: { approval_id: appr.id } });
    return approvalResponse(appr);
  } catch (e) {
    return fail("INTERNAL", (e && e.message) || "Internal error", 500);
  }
}