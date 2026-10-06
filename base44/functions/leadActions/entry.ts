import { makeCrudHandler } from "../../shared/crud.ts";

export default makeCrudHandler("Lead", { required: ["account_id"] });