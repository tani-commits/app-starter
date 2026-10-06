import { makeCrudHandler } from "../../shared/crud.ts";

// Raw activity record management. Use the `logActivity` action to create
// activities with the principal auto-stamped as the actor.
export default makeCrudHandler("Activity", {
  required: ["account_id", "entity_type", "entity_id", "type"]
});