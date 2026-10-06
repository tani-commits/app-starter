import { ok, fail } from "../../shared/response.ts";
import { resolvePrincipal, scopedGet, entity } from "../../shared/principal.ts";
import { logAction } from "../../shared/audit.ts";

// Extracts structured contact/company fields from source text using the
// built-in AI. Stages the result on the contact as pending_review and returns
// it for a human confirm card. Never auto-writes the canonical fields, and
// only uses facts present in the source (instructed in the prompt).
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const principal = await resolvePrincipal(req, body);
    if (!principal) return fail("UNAUTHORIZED", "Authentication required", 401);
    const { contactId, sourceText } = body;
    if (!contactId) return fail("VALIDATION_ERROR", "contactId required", 400);
    if (!sourceText || typeof sourceText !== "string")
      return fail("VALIDATION_ERROR", "sourceText required", 400);

    const contact = await scopedGet(principal, "Contact", contactId);
    if (!contact) return fail("NOT_FOUND", "Contact not found", 404);

    const schema = {
      type: "object",
      properties: {
        company: { type: "string" },
        job_title: { type: "string" },
        phone: { type: "string" },
        website: { type: "string" },
        industry: { type: "string" },
        notes: { type: "string" },
        confidence: { type: "number" }
      },
      additionalProperties: false
    };

    const prompt =
      "Extract structured contact and company fields from the source text below. " +
      "Use ONLY facts explicitly present in the text; for any field not present, return null. " +
      "Do not invent or infer beyond the text. Set confidence (0-1) for how well the text supports the extraction.\n\n" +
      `Source:\n"""${sourceText}"""`;

    const result = await principal.client.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    await entity(principal, "Contact").update(contactId, {
      enriched_data: result,
      enrichment_status: "pending_review"
    });
    await logAction(principal, { action: "enrich_contact", entity: "Contact", entityId: contactId, accountId: contact.account_id, metadata: { source_length: sourceText.length } });
    return ok({ contact_id: contactId, enrichment: result, status: "pending_review" });
  } catch (e) {
    return fail("INTERNAL", (e && e.message) || "Internal error", 500);
  }
}