import { defineGlobal } from "../../utils/registration/dependencies";
import { HacHeader } from "./hac-header";

// Registers <hac-header> and its dependencies in the global registry, as used by
// Home Assistant
defineGlobal("hac-header", HacHeader);

export { HacHeader };
