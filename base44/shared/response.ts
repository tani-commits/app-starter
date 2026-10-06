// Standard machine-readable response envelope for every action.
// Success: { ok: true, status, data }
// Failure: { ok: false, status, error: { code, message, details? } }
// Codes are stable strings, never prose, so agents can branch on them.

export function ok(data, status = 200) {
  return Response.json({ ok: true, status, data }, { status });
}

export function fail(code, message, status = 400, details) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  return Response.json({ ok: false, status, error }, { status });
}

// Typed error codes (agents branch on `error.code`).
export const Codes = {
  UNAUTHORIZED: { code: "UNAUTHORIZED", status: 401 },
  FORBIDDEN: { code: "FORBIDDEN", status: 403 },
  SCOPE_VIOLATION: { code: "SCOPE_VIOLATION", status: 403 },
  NOT_FOUND: { code: "NOT_FOUND", status: 404 },
  VALIDATION_ERROR: { code: "VALIDATION_ERROR", status: 400 },
  CONFLICT: { code: "CONFLICT", status: 409 },
  APPROVAL_REQUIRED: { code: "APPROVAL_REQUIRED", status: 202 },
  NOT_IMPLEMENTED: { code: "NOT_IMPLEMENTED", status: 501 },
  INTERNAL: { code: "INTERNAL", status: 500 }
};