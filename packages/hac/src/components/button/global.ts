import { defineGlobal } from "../../utils/dependencies";
import { HacButton } from "./hac-button";
import { HacButtonClose } from "./hac-button-close";

// Registers the button group in the global registry, as used by Home Assistant
defineGlobal("hac-button", HacButton);
defineGlobal("hac-button-close", HacButtonClose);

export { HacButton, HacButtonClose };
