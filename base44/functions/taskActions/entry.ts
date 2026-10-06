import { makeCrudHandler } from "../../shared/crud.ts";

export default makeCrudHandler("Task", { required: ["account_id", "title"], statusField: "status" });