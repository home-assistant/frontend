import type { HomeAssistant } from "../../types";

/** Return if a component is loaded. */
export const isComponentLoaded = (
  hassConfig: HomeAssistant["config"],
  component: string
): boolean => hassConfig && hassConfig.components.includes(component);
