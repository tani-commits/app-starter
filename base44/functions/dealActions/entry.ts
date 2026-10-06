import { makeCrudHandler } from "../../shared/crud.ts";

export default makeCrudHandler("Deal", { required: ["account_id", "title"] });