import { describe, expect, it } from "vitest";
import type { ConfigPath } from "../../src/common/util/config-path";
import {
  parseConfigSaveError,
  validationResultErrors,
  type ConfigValidationError,
} from "../../src/data/config";

const validationError = (
  message: string,
  path: ConfigPath,
  code: string | null = null
): ConfigValidationError => ({
  message,
  path,
  code,
  translation_key: null,
  translation_domain: null,
  translation_placeholders: {},
});

describe("config validation errors", () => {
  it("get the section key in front of validate_config paths", () => {
    expect(
      validationResultErrors({
        triggers: { valid: true, error: null, errors: [] },
        actions: {
          valid: false,
          error: "Bad delay at '[1].then[0].delay'",
          errors: [
            validationError("Bad delay", [1, "then", 0, "delay"]),
            validationError("Unknown device", [2]),
          ],
        },
        conditions: {
          valid: false,
          error: "Bad condition",
          errors: [validationError("Bad condition", [])],
        },
      })
    ).toEqual([
      validationError("Bad delay", ["actions", 1, "then", 0, "delay"]),
      validationError("Unknown device", ["actions", 2]),
      validationError("Bad condition", ["conditions"]),
    ]);

    // Scripts validate their sequence as actions
    expect(
      validationResultErrors(
        {
          actions: {
            valid: false,
            error: "Bad delay at '[0].delay'",
            errors: [validationError("Bad delay", [0, "delay"])],
          },
        },
        { actions: "sequence" }
      )
    ).toEqual([validationError("Bad delay", ["sequence", 0, "delay"])]);
  });

  it("are read from a failed save", () => {
    const errors = [
      validationError(
        "required key not provided",
        ["triggers", 1, "entity_id"],
        "required"
      ),
    ];
    expect(
      parseConfigSaveError({
        error: "Response error: 400",
        status_code: 400,
        body: {
          message:
            "Message malformed: required key not provided at 'triggers[1].entity_id'",
          errors,
        },
      })
    ).toEqual({
      message:
        "Message malformed: required key not provided at 'triggers[1].entity_id'",
      errors,
    });

    // Errors that are not about the config
    expect(
      parseConfigSaveError({
        error: "Response error: 401",
        status_code: 401,
        body: { message: "Unauthorized" },
      })
    ).toEqual({ message: "Unauthorized", errors: [] });

    expect(
      parseConfigSaveError({
        error: "Request error",
        status_code: undefined,
        body: undefined,
      })
    ).toEqual({ message: "Request error", errors: [] });
  });
});
