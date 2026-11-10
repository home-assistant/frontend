import type { ConfigPath } from "../common/util/config-path";
import type { HomeAssistant } from "../types";

export interface ConfigValidationError {
  message: string;
  /** Where the problem is, `[]` when core does not know. */
  path: ConfigPath;
  code?: string | null;
}

export interface ValidConfig {
  valid: true;
  error: null;
}

export interface InvalidConfig {
  valid: false;
  error: string;
  /** Paths start at the item index of the section. */
  errors: ConfigValidationError[];
}

type ValidKeys = "triggers" | "actions" | "conditions";

export type ValidationSectionKeys = Partial<Record<ValidKeys, string>>;

export const validateConfig = <T extends Partial<Record<ValidKeys, unknown>>>(
  hass: HomeAssistant,
  config: T
): Promise<Record<keyof T, ValidConfig | InvalidConfig>> =>
  hass.callWS({
    type: "validate_config",
    ...config,
  });

/**
 * Flattens a `validate_config` result into errors with paths from the config
 * root. `sectionKeys` names the config key of a section when it differs from
 * the key it is validated under, e.g. `{ actions: "sequence" }` for scripts.
 */
export const validationResultErrors = (
  result: Partial<Record<ValidKeys, ValidConfig | InvalidConfig>>,
  sectionKeys: ValidationSectionKeys = {}
): ConfigValidationError[] =>
  (Object.keys(result) as ValidKeys[]).flatMap((key) => {
    const section = result[key];
    if (!section || section.valid) {
      return [];
    }
    const sectionKey = sectionKeys[key] ?? key;
    return section.errors.map((error) => ({
      ...error,
      path: [sectionKey, ...error.path],
    }));
  });

export const validateConfigErrors = async (
  hass: HomeAssistant,
  config: Partial<Record<ValidKeys, unknown>>,
  sectionKeys?: ValidationSectionKeys
): Promise<ConfigValidationError[]> =>
  validationResultErrors(await validateConfig(hass, config), sectionKeys);

export interface ConfigSaveError {
  message: string;
  errors: ConfigValidationError[];
}

/**
 * Reads the errors of a failed config save. Errors that are not about the
 * config, like a network error, only have a message.
 */
export const parseConfigSaveError = (err: unknown): ConfigSaveError => {
  const { body, error } = (err ?? {}) as { body?: unknown; error?: unknown };
  const bodyObject =
    body && typeof body === "object"
      ? (body as { message?: unknown; errors?: unknown })
      : undefined;
  const message = String(
    bodyObject?.message ||
      error ||
      (typeof body === "string" && body) ||
      (err instanceof Error && err.message) ||
      err
  );
  return {
    message,
    errors: Array.isArray(bodyObject?.errors)
      ? (bodyObject.errors as ConfigValidationError[])
      : [],
  };
};
