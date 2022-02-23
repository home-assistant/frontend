import { HomeAssistant } from "../types";

interface ValidationResult {
  valid: boolean;
  error: string | null;
}

type ValidKeys = "trigger" | "action" | "condition";

export const validateConfig = <
  T extends Partial<{ [key in ValidKeys]: unknown }>
>(
  hass: HomeAssistant,
  config: T
): Promise<Record<keyof T, ValidationResult>> =>
  hass.callWS({
    type: "validate_config",
    ...config,
  });
