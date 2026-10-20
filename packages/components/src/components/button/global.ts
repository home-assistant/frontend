import { defineGlobal } from "../../utils/registration/dependencies";
import { HacButton } from "./hac-button";

// Registers <hac-button> and its dependencies in the global registry, as used
// by Home Assistant
defineGlobal("hac-button", HacButton);

export { HacButton };
