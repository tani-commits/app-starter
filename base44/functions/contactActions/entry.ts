import { makeCrudHandler } from "../../shared/crud.ts";

export default makeCrudHandler("Contact", {
  required: ["account_id", "first_name"],
  statusField: "status"
});