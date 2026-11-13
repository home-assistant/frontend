import { define } from "../../utils/registration/define";
import { HacCard } from "./hac-card";
import { TAG_NAME } from "./info";

// Registers <hac-card> in the global registry, as used by Home Assistant
define(TAG_NAME, HacCard);

export { HacCard };
