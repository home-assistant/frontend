import { define } from "../../utils/define";
import { HacCard } from "./hac-card";

// Registers <hac-card> in the global registry, as used by Home Assistant
define("hac-card", HacCard);

export { HacCard };
