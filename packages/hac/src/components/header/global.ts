import { define } from "../../utils/define";
import { HacHeader } from "./hac-header";

// Registers <hac-header> in the global registry, as used by Home Assistant
define("hac-header", HacHeader);

export { HacHeader };
