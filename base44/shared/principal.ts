import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

// Resolves the calling principal: either a human (or agent-as-user) via the
// request session, or a scoped service account via an API key. Returns a
// normalized principal object every action function uses for scope + audit.
//
// principal = {
//   kind: "human" | "agent",
//   id, name, role,
//   accountIds: string[] | null,   // null = admin bypass (humans only)
//   isAdmin: boolean,
//   client,                        // the createClientFromRequest client
//   useServiceRole: boolean,       // true for API-key agents (manual scope enforcement)
//   permissions: string[] | null
// }

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashKey(key) {
  return sha256(key);
}

export async function resolvePrincipal(req, body) {
  let client;
  try {
    client = createClientFromRequest(req);
  } catch (e) {
    client = null;
  }

  // 1) Session principal (human user, or an agent that authenticated as a user).
  if (client) {
    try {
      const user = await client.auth.me();
      if (user) {
        const role = user.role || "member";
        const accountIds =
          role === "admin" ? null : (user.account_ids || (user.data && user.data.account_ids) || []);
        return {
          kind: role === "agent" ? "agent" : "human",
          id: user.id,
          name: user.email || user.full_name || user.id,
          role,
          accountIds,
          isAdmin: role === "admin",
          client,
          useServiceRole: false,
          permissions: null
        };
      }
    } catch (e) {
      // not authenticated as a user — fall through to API-key path
    }
  }

  // 2) API-key principal (scoped service account).
  const agentId = req.headers.get("x-agent-id") || (body && body.agent_id);
  const agentKey = req.headers.get("x-agent-key") || (body && body.api_key);
  if (agentId && agentKey && client) {
    try {
      const agent = await client.asServiceRole.entities.Agent.get(agentId);
      if (
        agent &&
        agent.status === "active" &&
        agent.api_key_hash &&
        (await sha256(agentKey)) === agent.api_key_hash
      ) {
        // best-effort last-used stamp
        client.asServiceRole.entities.Agent.update(agentId, { last_used_date: new Date().toISOString() }).catch(() => {});
        return {
          kind: "agent",
          id: agent.id,
          name: agent.name,
          role: "agent",
          accountIds: agent.account_ids || [],
          isAdmin: false,
          client,
          useServiceRole: true,
          permissions: agent.permissions || []
        };
      }
    } catch (e) {
      // invalid agent credentials
    }
  }

  return null;
}

// Pick the entity collection honoring the principal's access mode.
export function entity(principal, name) {
  return principal.useServiceRole
    ? principal.client.asServiceRole.entities[name]
    : principal.client.entities[name];
}

// Inject account_id scope for service-role (agent) reads. For humans, RLS
// already enforces scope, so the query is returned untouched.
export function applyScope(principal, query, scopeField = "account_id") {
  const base = query || {};
  if (!principal.useServiceRole || principal.accountIds === null) return base;
  return { ...base, [scopeField]: { $in: principal.accountIds } };
}

// Load a single record, returning null if missing OR out of scope for agents.
export async function scopedGet(principal, name, id, scopeField = "account_id") {
  const rec = await entity(principal, name).get(id).catch(() => null);
  if (!rec) return null;
  if (principal.useServiceRole && principal.accountIds !== null) {
    const val = scopeField === "id" ? rec.id : rec.account_id;
    if (!principal.accountIds.includes(val)) return null;
  }
  return rec;
}

export function assertInScope(principal, accountId) {
  if (principal.accountIds === null) return true; // admin
  return Array.isArray(accountId) ? accountId.every((a) => principal.accountIds.includes(a)) : principal.accountIds.includes(accountId);
}

export function hasPermission(principal, perm) {
  if (!principal.permissions) return true; // humans are role-gated, not permission-gated here
  return principal.permissions.includes(perm) || principal.permissions.includes("*");
}