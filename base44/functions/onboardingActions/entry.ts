import { makeCrudHandler } from "../../shared/crud.ts";

export default makeCrudHandler("Onboarding", { required: ["account_id", "name"] });