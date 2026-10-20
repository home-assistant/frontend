import { defineGlobal } from "../../utils/registration/dependencies";
import { HacCard } from "./hac-card";
import { TAG_NAME } from "./info";

// Registers <hac-card> and its dependencies in the global registry, as used by
// Home Assistant
defineGlobal(TAG_NAME, HacCard);

export { HacCard };
