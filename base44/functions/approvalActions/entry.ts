import { ok, fail } from "../../shared/response.ts";
import { resolvePrincipal, applyScope } from "../../shared/principal.ts";
import { logAction, emitEvent } from "../../shared/audit.ts";

// Resolves the human-approval queue. Admin/manager only, scoped to their
// accounts. Approve executes the stored action; reject discards it.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const principal = await resolvePrincipal(req, body);
    if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
    if (principal.role !== "admin" && principal.role !== "manager")
      return fail("FORBIDDEN", "Admin or manager only", 403);
    const E = principal.client.asServiceRole.entities.ApprovalRequest;
    const action = body.action;

    if (action === "list") {
      const query = applyScope(principal, { status: "pending", ...(body.filter || {}) }, "account_id");
      const items = await E.filter(query, "-created_date", Math.min(body.pageSize || 50, 200));
      return ok({ items });
    }

    if (action === "approve") {
      const appr = await E.get(body.id).catch(() => null);
      if (!appr) return fail("NOT_FOUND", "Approval not found", 404);
      if (appr.status !== "pending") return fail("CONFLICT", "Approval already resolved", 409);
      if (principal.accountIds !== null && !principal.accountIds.includes(appr.account_id))
        return fail("SCOPE_VIOLATION", "Approval out of scope", 403);
      const result = await executeApproved(principal, appr);
      await E.update(body.id, {
        status: "executed",
        resolved_by_id: principal.id,
        resolved_by_name: principal.name,
        resolved_date: new Date().toISOString(),
        resolution_notes: body.notes || ""
      });
      await logAction(principal, { action: "approve_action", entity: "ApprovalRequest", entityId: body.id, accountId: appr.account_id, metadata: { action_type: appr.action_type, result } });
      return ok({ id: body.id, status: "executed", result });
    }

    if (action === "reject") {
      const appr = await E.get(body.id).catch(() => null);
      if (!appr) return fail("NOT_FOUND", "Approval not found", 404);
      if (appr.status !== "pending") return fail("CONFLICT", "Approval already resolved", 409);
      if (principal.accountIds !== null && !principal.accountIds.includes(appr.account_id))
        return fail("SCOPE_VIOLATION", "Approval out of scope", 403);
      await E.update(body.id, {
        status: "rejected",
        resolved_by_id: principal.id,
        resolved_by_name: principal.name,
        resolved_date: new Date().toISOString(),
        resolution_notes: body.notes || ""
      });
      await logAction(principal, { action: "reject_action", entity: "ApprovalRequest", entityId: body.id, accountId: appr.account_id, metadata: { action_type: appr.action_type } });
      return ok({ id: body.id, status: "rejected" });
    }

    return fail("VALIDATION_ERROR", `Unknown action: ${action}`, 400);
  } catch (e) {
    return fail("INTERNAL", (e && e.message) || "Internal error", 500);
  }
}

async function executeApproved(principal, appr) {
  const svc = principal.client.asServiceRole;
  const t = appr.action_type;
  if (t.startsWith("delete:")) {
    const en = t.split(":")[1];
    await svc.entities[en].delete(appr.payload.id);
    emitEvent(principal, { type: "deleted", entity: en, entityId: appr.payload.id, accountId: appr.account_id, payload: {} });
    return { deleted: appr.payload.id };
  }
  if (t === "bulkDelete") {
    const en = appr.payload.entity;
    await svc.entities[en].deleteMany({ id: { $in: appr.payload.ids } });
    return { deleted: appr.payload.ids.length };
  }
  if (t === "runAutomation") {
    const auto = await svc.entities.Automation.get(appr.payload.automationId).catch(() => null);
    if (!auto) return { error: "automation_not_found" };
    await svc.entities.Automation.update(auto.id, { last_run_date: new Date().toISOString() });
    if (auto.action_type === "create_project") {
      const p = await svc.entities.Project.create({
        account_id: auto.account_id,
        name: (auto.action_config && auto.action_config.name) || "Automated project",
        status: "planning",
        members: (auto.action_config && auto.action_config.members) || []
      });
      emitEvent(principal, { type: "project_created", entity: "Project", entityId: p.id, accountId: auto.account_id, payload: { automation: auto.id } });
      return { project_id: p.id };
    }
    if (auto.action_type === "create_task") {
      const tk = await svc.entities.Task.create({
        account_id: auto.account_id,
        title: (auto.action_config && auto.action_config.title) || "Automated task",
        status: "todo",
        priority: (auto.action_config && auto.action_config.priority) || "medium"
      });
      emitEvent(principal, { type: "created", entity: "Task", entityId: tk.id, accountId: auto.account_id, payload: {} });
      return { task_id: tk.id };
    }
    return { executed: true, action_type: auto.action_type };
  }
  return { executed: false, note: "unknown_action_type" };
}