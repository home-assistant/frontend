import { StructError } from "superstruct";
import type { HomeAssistant } from "../../types";

export const handleStructError = (
  hass: HomeAssistant,
  err: Error
): { warnings: string[]; errors?: string[] } => {
  if (!(err instanceof StructError)) {
    return { warnings: [err.message], errors: undefined };
  }
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const failure of err.failures()) {
    if (failure.value === undefined) {
      errors.push(
        hass.localize("ui.errors.config.key_missing", {
          key: failure.path.join("."),
        })
      );
    } else if (failure.type === "never") {
      warnings.push(
        hass.localize("ui.errors.config.key_not_expected", {
          key: failure.path.join("."),
        })
      );
    } else if (failure.type === "union") {
      continue;
    } else if (failure.type === "enums") {
      warnings.push(
        hass.localize("ui.errors.config.key_wrong_type", {
          key: failure.path.join("."),
          type_correct: failure.message.replace("Expected ", "").split(", ")[0],
          type_wrong: JSON.stringify(failure.value),
        })
      );
    } else {
      warnings.push(
        hass.localize("ui.errors.config.key_wrong_type", {
          key: failure.path.join("."),
          type_correct: failure.refinement || failure.type,
          type_wrong: JSON.stringify(failure.value),
        })
      );
    }
  }
  return { warnings, errors };
};
