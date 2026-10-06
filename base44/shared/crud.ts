import { ok, fail } from "./response.ts";
import { resolvePrincipal, applyScope, scopedGet, entity } from "./principal.ts";
import { logAction, emitEvent } from "./audit.ts";
import { isHighImpact, createApproval, approvalResponse } from "./approval.ts";
import { waitUntil } from "base44:runtime";

// Factory: builds a full CRUD action handler for one entity. Every entity in
// the CRM exposes the same actions through this, so the surface is uniform
// and discoverable for agents: list, get, create, update, archive, delete,
// bulkDelete. Scope, audit, events, and approval routing are applied once here.
//
// opts:
//   scopeField      — field used for account scoping ("account_id" default;
//                     "id" for ClientAccount)
//   required        — fields required on create
//   statusField     — field used by the archive action (soft delete)
//   highImpactDeletes — force single-record deletes through approval
export function makeCrudHandler(entityName, opts = {}) {
  const {
    scopeField = "account_id",
    required = [],
    statusField = null,
    highImpactDeletes = false
  } = opts;

  return async function (req) {
    try {
      const body = await req.json().catch(() => ({}));
      const principal = await resolvePrincipal(req, body);
      if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
      const action = body.action;
      if (!action) return fail("VALIDATION_ERROR", "Missing 'action'", 400);
      const E = entity(principal, entityName);
      const readOnly = principal.role === "client";

      if (action === "list") {
        let query = applyScope(principal, body.filter || {}, scopeField);
        const lim = Math.min(body.pageSize || 50, 200);
        if (body.cursor) query = { ...query, created_date: { $lt: body.cursor } };
        const sort = body.cursor ? "-created_date" : body.sort || "-created_date";
        const items = await E.filter(query, sort, lim + 1);
        const hasMore = items.length > lim;
        const records = hasMore ? items.slice(0, lim) : items;
        const nextCursor = hasMore && records.length ? records[records.length - 1].created_date : null;
        return ok({ items: records, nextCursor, hasMore, pageSize: lim });
      }

      if (action === "get") {
        const rec = await scopedGet(principal, entityName, body.id, scopeField);
        if (!rec) return fail("NOT_FOUND", "Record not found", 404);
        return ok(rec);
      }

      if (action === "create") {
        if (readOnly) return fail("FORBIDDEN", "Clients have read-only access", 403);
        const data = body.data || {};
        for (const f of required) {
          if (data[f] === undefined || data[f] === null || data[f] === "")
            return fail("VALIDATION_ERROR", `Missing required field: ${f}`, 400);
        }
        if (principal.useServiceRole && principal.accountIds !== null) {
          if (scopeField === "id") return fail("FORBIDDEN", "Agents cannot create client accounts", 403);
          if (!principal.accountIds.includes(data.account_id))
            return fail("SCOPE_VIOLATION", "account_id not in agent scope", 403);
        }
        const rec = await E.create(data);
        const accId = scopeField === "id" ? rec.id : rec.account_id;
        await logAction(principal, { action: "create", entity: entityName, entityId: rec.id, accountId: accId, metadata: { data } });
        emitEvent(principal, { type: "created", entity: entityName, entityId: rec.id, accountId: accId, payload: {} });
        return ok(rec, 201);
      }

      if (action === "update") {
        if (readOnly) return fail("FORBIDDEN", "Clients have read-only access", 403);
        const existing = await scopedGet(principal, entityName, body.id, scopeField);
        if (!existing) return fail("NOT_FOUND", "Record not found", 404);
        const accId = scopeField === "id" ? existing.id : existing.account_id;
        const rec = await E.update(body.id, body.data || {});
        await logAction(principal, { action: "update", entity: entityName, entityId: body.id, accountId: accId, metadata: { changes: body.data || {} } });
        emitEvent(principal, { type: "updated", entity: entityName, entityId: body.id, accountId: accId, payload: { changes: body.data || {} } });
        return ok(rec);
      }

      if (action === "archive") {
        if (!statusField) return fail("NOT_IMPLEMENTED", "Archive not supported for this entity", 501);
        if (readOnly) return fail("FORBIDDEN", "Clients have read-only access", 403);
        const existing = await scopedGet(principal, entityName, body.id, scopeField);
        if (!existing) return fail("NOT_FOUND", "Record not found", 404);
        const accId = scopeField === "id" ? existing.id : existing.account_id;
        const rec = await E.update(body.id, { [statusField]: "archived" });
        await logAction(principal, { action: "archive", entity: entityName, entityId: body.id, accountId: accId, metadata: {} });
        return ok(rec);
      }

      if (action === "delete") {
        const existing = await scopedGet(principal, entityName, body.id, scopeField);
        if (!existing) return fail("NOT_FOUND", "Record not found", 404);
        const accId = scopeField === "id" ? existing.id : existing.account_id;
        if (highImpactDeletes || entityName === "ClientAccount") {
          const appr = await createApproval(principal, {
            actionType: `delete:${entityName}`,
            payload: { id: body.id },
            accountId: accId,
            summary: `Delete ${entityName} "${existing.name || body.id}"`
          });
          await logAction(principal, { action: "delete_requested", entity: entityName, entityId: body.id, accountId: accId, status: "pending_approval", metadata: { approval_id: appr.id } });
          return approvalResponse(appr);
        }
        if (readOnly) return fail("FORBIDDEN", "Clients have read-only access", 403);
        await E.delete(body.id);
        await logAction(principal, { action: "delete", entity: entityName, entityId: body.id, accountId: accId, metadata: {} });
        emitEvent(principal, { type: "deleted", entity: entityName, entityId: body.id, accountId: accId, payload: {} });
        return ok({ id: body.id, deleted: true });
      }

      if (action === "bulkDelete") {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length) return fail("VALIDATION_ERROR", "ids required", 400);
        const first = await scopedGet(principal, entityName, ids[0], scopeField);
        const accId = first ? (scopeField === "id" ? first.id : first.account_id) : null;
        const appr = await createApproval(principal, {
          actionType: "bulkDelete",
          payload: { entity: entityName, ids },
          accountId: accId,
          summary: `Bulk delete ${ids.length} ${entityName}(s)`
        });
        await logAction(principal, { action: "bulk_delete_requested", entity: entityName, accountId: accId, status: "pending_approval", metadata: { approval_id: appr.id, count: ids.length } });
        return approvalResponse(appr);
      }

      return fail("VALIDATION_ERROR", `Unknown action: ${action}`, 400);
    } catch (e) {
      return fail("INTERNAL", (e && e.message) || "Internal error", 500);
    }
  };
}