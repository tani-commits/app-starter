import { makeCrudHandler } from "../../shared/crud.ts";

export default makeCrudHandler("Project", { required: ["account_id", "name"] });