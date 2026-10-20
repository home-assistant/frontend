import { defineGlobal } from "../../../utils/registration/dependencies";
import { HacButtonClose } from "./hac-button-close";
import { TAG_NAME } from "./info";

// Registers <hac-button-close> and its dependencies in the global registry, as used by
// Home Assistant
defineGlobal(TAG_NAME, HacButtonClose);

export { HacButtonClose };
