import { defineGlobal } from "../../utils/registration/dependencies";
import { HacButton } from "./hac-button";
import { TAG_NAME } from "./info";

// Registers <hac-button> and its dependencies in the global registry, as used by
// Home Assistant
defineGlobal(TAG_NAME, HacButton);

export { HacButton };
