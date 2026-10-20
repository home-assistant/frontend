import { defineGlobal } from "../../../utils/registration/dependencies";
import { HacButtonClose } from "./hac-button-close";

// Registers <hac-button-close> and its dependencies in the global registry, as
// used by Home Assistant
defineGlobal("hac-button-close", HacButtonClose);

export { HacButtonClose };
