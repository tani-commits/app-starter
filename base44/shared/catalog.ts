// Machine-readable catalogue of every action exposed by the action layer.
// Returned verbatim by the `actionsCatalog` function so agents can discover
// and call tools without hardcoding. Shaped like an OpenAPI-style summary.

import { appConfig } from "./appConfig.ts";

export const CATALOG = {
  name: `${appConfig.name} Action Layer`,
  version: "1.0.0",
  description:
    "Agent-first CRM action layer. Every action is callable by humans and scoped service accounts; writes are audited and high-impact actions route to a human-approval queue.",
  auth: {
    humans: "Session (email/password or Google) via the app; RLS enforces account scope.",
    agents: "API key via x-agent-id + x-agent-key headers (or agent_id + api_key in body). Scoped by the Agent record's account_ids and permissions."
  },
  response: {
    success: { ok: true, status: "number", data: "object|array" },
    failure: { ok: false, status: "number", error: { code: "string", message: "string", details: "any?" } },
    codes: ["UNAUTHORIZED", "FORBIDDEN", "SCOPE_VIOLATION", "NOT_FOUND", "VALIDATION_ERROR", "CONFLICT", "APPROVAL_REQUIRED", "NOT_IMPLEMENTED", "INTERNAL"]
  },
  actions: {
    clientAccountActions: { actions: ["list", "get", "create", "update", "delete", "bulkDelete"], scopeField: "id", notes: "Admin-only create/delete." },
    contactActions: { actions: ["list", "get", "create", "update", "archive", "delete", "bulkDelete"], required: ["account_id", "first_name"], statusField: "status" },
    leadActions: { actions: ["list", "get", "create", "update", "delete", "bulkDelete"], required: ["account_id"] },
    dealActions: { actions: ["list", "get", "create", "update", "delete", "bulkDelete"], required: ["account_id", "title"] },
    projectActions: { actions: ["list", "get", "create", "update", "delete", "bulkDelete"], required: ["account_id", "name"] },
    taskActions: { actions: ["list", "get", "create", "update", "archive", "delete", "bulkDelete"], required: ["account_id", "title"], statusField: "status" },
    activityActions: { actions: ["list", "get", "create", "delete", "bulkDelete"], required: ["account_id", "entity_type", "entity_id", "type"] },
    onboardingActions: { actions: ["list", "get", "create", "update", "delete", "bulkDelete"], required: ["account_id", "name"] },
    automationActions: { actions: ["list", "get", "create", "update", "delete", "bulkDelete"], required: ["account_id", "name", "trigger", "action_type"] },
    agentActions: { actions: ["list", "get", "create", "update", "delete", "rotateKey"], notes: "Admin-only writes; returns plaintext api_key on create/rotateKey." },
    moveDealStage: { params: { dealId: "string", stage: "new|qualified|proposal|negotiation|won|lost" }, emits: ["deal_stage_changed", "deal_won?"] },
    assignTask: { params: { taskId: "string", assigneeId: "string?" }, emits: ["task_assigned"] },
    createProjectFromDeal: { params: { dealId: "string", name: "string?" }, emits: ["project_created"] },
    logActivity: { params: { accountId: "string", entityType: "string", entityId: "string", type: "string", description: "string?" } },
    runAutomation: { params: { automationId: "string" }, approval: true, emits: ["automation_run"] },
    importLeads: { params: { accountId: "string", leads: "array" }, notes: "Bulk additive; capped at 200/call." },
    enrichContact: { params: { contactId: "string", sourceText: "string" }, notes: "Extracts structured fields via AI; stages for review, never auto-writes." },
    generateContent: { params: { accountId: "string", topic: "string", format: "string?", tone: "string?", instructions: "string?" }, notes: "Built-in AI; output logged as an Activity." },
    approvalActions: { actions: ["list", "approve", "reject"], notes: "Admin/manager resolves the queue." },
    auditActions: { actions: ["list"], params: { accountId: "string?", entityType: "string?", actorType: "string?" } },
    actionsCatalog: { notes: "Returns this catalogue." }
  }
};