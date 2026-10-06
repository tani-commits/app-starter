import { ok, fail } from "../../shared/response.ts";
import { resolvePrincipal, entity } from "../../shared/principal.ts";
import { logAction } from "../../shared/audit.ts";

// Content generation via the built-in AI. Output is logged as an Activity
// tied to the account so it is auditable and retrievable.
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const principal = await resolvePrincipal(req, body);
    if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
    const { accountId, topic, format, tone, instructions } = body;
    if (!accountId) return fail("VALIDATION_ERROR", "accountId required", 400);
    if (!topic) return fail("VALIDATION_ERROR", "topic required", 400);
    if (principal.useServiceRole && principal.accountIds !== null && !principal.accountIds.includes(accountId))
      return fail("SCOPE_VIOLATION", "Account not in scope", 403);

    const fmt = format || "blog";
    const t = tone || "professional";
    const prompt =
      `Generate ${fmt} content about "${topic}" for a client account. ` +
      `Tone: ${t}. ${instructions ? "Additional instructions: " + instructions : ""} ` +
      "Return only the content.";

    const content = await principal.client.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    await entity(principal, "Activity").create({
      account_id: accountId,
      entity_type: "account",
      entity_id: accountId,
      type: "note",
      description: `Generated ${fmt} content about "${topic}"`,
      actor_id: principal.id,
      actor_type: principal.kind,
      actor_name: principal.name,
      metadata: { topic, format: fmt, tone: t, content }
    });
    await logAction(principal, { action: "generate_content", entity: "Activity", accountId, metadata: { topic, format: fmt } });
    return ok({ accountId, topic, format: fmt, tone: t, content });
  } catch (e) {
    return fail("INTERNAL", (e && e.message) || "Internal error", 500);
  }
}