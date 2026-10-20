import { defineGlobal } from "../../utils/registration/dependencies";
import { HacCard } from "./hac-card";

// Registers <hac-card> and its dependencies in the global registry, as used by
// Home Assistant
defineGlobal("hac-card", HacCard);

export { HacCard };
