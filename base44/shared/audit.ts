import { waitUntil } from "base44:runtime";

// Records an audit entry for every action. Always written via the service
// role so audit is reliable regardless of principal type. Awaited so the
// record is durable before the response returns.
export async function logAction(principal, params) {
  try {
    const { action, entity, entityId, accountId, status = "success", metadata = {} } = params;
    await principal.client.asServiceRole.entities.AuditLog.create({
      account_id: accountId || null,
      action,
      entity_type: entity,
      entity_id: entityId || null,
      status,
      actor_id: principal.id,
      actor_type: principal.kind,
      actor_name: principal.name,
      metadata
    });
  } catch (e) {
    // audit is best-effort; never fail the action because audit failed
  }
}

// Emits a state-change event (fire-and-forget after the response).
export function emitEvent(principal, params) {
  try {
    const { type, entity, entityId, accountId, payload = {} } = params;
    waitUntil(
      principal.client.asServiceRole.entities.Event
        .create({
          account_id: accountId || null,
          event_type: type,
          entity_type: entity,
          entity_id: entityId || null,
          payload
        })
        .catch(() => {})
    );
  } catch (e) {}
}