import { makeCrudHandler } from "../../shared/crud.ts";

// ClientAccount CRUD. scopeField "id" because the account IS the tenant.
// Admin-only create/delete is enforced by RLS; delete routes to approval.
export default makeCrudHandler("ClientAccount", { scopeField: "id", required: ["name"] });