import { HomeAssistant } from "../types";

interface ValidConfig {
  valid: true;
  error: null;
}

interface InvalidConfig {
  valid: false;
  error: string;
}

type ValidKeys = "trigger" | "action" | "condition";

export const validateConfig = <
  T extends Partial<{ [key in ValidKeys]: unknown }>,
>(
  hass: HomeAssistant,
  config: T
): Promise<Record<keyof T, ValidConfig | InvalidConfig>> =>
  hass.callWS({
    type: "validate_config",
    ...config,
  });
