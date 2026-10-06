import { makeCrudHandler } from "../../shared/crud.ts";

export default makeCrudHandler("Automation", {
  required: ["account_id", "name", "trigger", "action_type"]
});