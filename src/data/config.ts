import type { CallWS } from "../types";

export interface ValidConfig {
  valid: true;
  error: null;
}

export interface InvalidConfig {
  valid: false;
  error: string;
}

type ValidKeys = "triggers" | "actions" | "conditions";

export const validateConfig = <T extends Partial<Record<ValidKeys, unknown>>>(
  callWS: CallWS,
  config: T
): Promise<Record<keyof T, ValidConfig | InvalidConfig>> =>
  callWS({
    type: "validate_config",
    ...config,
  });
