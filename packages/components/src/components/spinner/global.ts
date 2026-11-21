import { define } from "../../utils/registration/define";
import { HacSpinner } from "./hac-spinner";
import { TAG_NAME } from "./info";

// Registers <hac-spinner> in the global registry, as used by Home Assistant
define(TAG_NAME, HacSpinner);

export { HacSpinner };
