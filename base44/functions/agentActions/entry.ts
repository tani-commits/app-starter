import { ok, fail } from "../../shared/response.ts";
import { resolvePrincipal, hashKey } from "../../shared/principal.ts";
import { logAction } from "../../shared/audit.ts";

// Manages scoped service accounts. Admin-only. On create/rotateKey the
// plaintext API key is returned ONCE; only its SHA-256 hash is stored.
function genKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "ch_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const principal = await resolvePrincipal(req, body);
    if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
    if (principal.role !== "admin") return fail("FORBIDDEN", "Admin only", 403);
    const E = principal.client.asServiceRole.entities.Agent;
    const action = body.action;

    if (action === "list") {
      const items = await E.list("-created_date", 200);
      return ok({ items });
    }
    if (action === "get") {
      const rec = await E.get(body.id).catch(() => null);
      if (!rec) return fail("NOT_FOUND", "Agent not found", 404);
      return ok(rec);
    }
    if (action === "create") {
      const data = body.data || {};
      if (!data.name) return fail("VALIDATION_ERROR", "name required", 400);
      const apiKey = genKey();
      const rec = await E.create({
        name: data.name,
        status: data.status || "active",
        account_ids: data.account_ids || [],
        permissions: data.permissions || [],
        api_key_hash: await hashKey(apiKey),
        description: data.description || ""
      });
      await logAction(principal, { action: "create_agent", entity: "Agent", entityId: rec.id, accountId: null, metadata: { name: data.name } });
      return ok({ agent: rec, api_key: apiKey }, 201);
    }
    if (action === "update") {
      const existing = await E.get(body.id).catch(() => null);
      if (!existing) return fail("NOT_FOUND", "Agent not found", 404);
      const rec = await E.update(body.id, body.data || {});
      await logAction(principal, { action: "update_agent", entity: "Agent", entityId: body.id, accountId: null, metadata: { changes: body.data || {} } });
      return ok(rec);
    }
    if (action === "rotateKey") {
      const existing = await E.get(body.id).catch(() => null);
      if (!existing) return fail("NOT_FOUND", "Agent not found", 404);
      const apiKey = genKey();
      await E.update(body.id, { api_key_hash: await hashKey(apiKey) });
      await logAction(principal, { action: "rotate_agent_key", entity: "Agent", entityId: body.id, accountId: null, metadata: {} });
      return ok({ id: body.id, api_key: apiKey });
    }
    if (action === "delete") {
      await E.delete(body.id).catch(() => null);
      await logAction(principal, { action: "delete_agent", entity: "Agent", entityId: body.id, accountId: null, metadata: {} });
      return ok({ id: body.id, deleted: true });
    }
    return fail("VALIDATION_ERROR", `Unknown action: ${action}`, 400);
  } catch (e) {
    return fail("INTERNAL", (e && e.message) || "Internal error", 500);
  }
}