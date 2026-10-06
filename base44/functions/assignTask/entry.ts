import { ok, fail } from "../../shared/response.ts";
import { resolvePrincipal, scopedGet, entity } from "../../shared/principal.ts";
import { logAction, emitEvent } from "../../shared/audit.ts";

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const principal = await resolvePrincipal(req, body);
    if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
    if (principal.role === "client") return fail("FORBIDDEN", "Clients have read-only access", 403);
    const { taskId, assigneeId } = body;
    if (!taskId) return fail("VALIDATION_ERROR", "taskId required", 400);

    const task = await scopedGet(principal, "Task", taskId);
    if (!task) return fail("NOT_FOUND", "Task not found", 404);
    const updated = await entity(principal, "Task").update(taskId, { assignee_id: assigneeId || null });
    await logAction(principal, { action: "assign_task", entity: "Task", entityId: taskId, accountId: task.account_id, metadata: { assignee_id: assigneeId || null } });
    emitEvent(principal, { type: "task_assigned", entity: "Task", entityId: taskId, accountId: task.account_id, payload: { assignee_id: assigneeId || null } });
    return ok({ task: updated });
  } catch (e) {
    return fail("INTERNAL", (e && e.message) || "Internal error", 500);
  }
}