import { ok, fail } from "./response.ts";

// Actions that must NOT execute silently — they create an ApprovalRequest
// and return 202 APPROVAL_REQUIRED. An admin/manager resolves them later.
export const HIGH_IMPACT = {
  "delete:ClientAccount": true,
  bulkDelete: true,
  runAutomation: true
};

export function isHighImpact(actionType) {
  return !!HIGH_IMPACT[actionType];
}

export async function createApproval(principal, { actionType, payload, accountId, summary }) {
  const rec = await principal.client.asServiceRole.entities.ApprovalRequest.create({
    account_id: accountId || null,
    action_type: actionType,
    payload: payload || {},
    summary: summary || actionType,
    status: "pending",
    requested_by_id: principal.id,
    requested_by_type: principal.kind,
    requested_by_name: principal.name
  });
  return rec;
}

// Standard 202 envelope for a queued action.
export function approvalResponse(approval) {
  return Response.json(
    { ok: true, status: 202, data: { approval_id: approval.id, status: "pending_approval" } },
    { status: 202 }
  );
}