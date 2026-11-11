import { describe, expect, it } from "vitest";
import {
  parseConfigSaveError,
  validationResultErrors,
} from "../../src/data/config";

describe("config validation errors", () => {
  it("get the section key in front of validate_config paths", () => {
    expect(
      validationResultErrors({
        triggers: { valid: true, error: null },
        actions: {
          valid: false,
          error: "Bad delay at 'actions[1].then[0].delay'",
          errors: [
            { message: "Bad delay", path: [1, "then", 0, "delay"] },
            { message: "Unknown device", path: [] },
          ],
        },
        conditions: {
          valid: false,
          error: "Bad condition",
          errors: [{ message: "Bad condition", path: [0] }],
        },
      })
    ).toEqual([
      { message: "Bad delay", path: ["actions", 1, "then", 0, "delay"] },
      { message: "Unknown device", path: ["actions"] },
      { message: "Bad condition", path: ["conditions", 0] },
    ]);

    // Scripts validate their sequence as actions
    expect(
      validationResultErrors(
        {
          actions: {
            valid: false,
            error: "Bad delay",
            errors: [{ message: "Bad delay", path: [0, "delay"] }],
          },
        },
        { actions: "sequence" }
      )
    ).toEqual([{ message: "Bad delay", path: ["sequence", 0, "delay"] }]);
  });

  it("are read from a failed save", () => {
    const errors = [
      { message: "Bad for", path: ["triggers", 1, "for"], code: "invalid" },
    ];
    expect(
      parseConfigSaveError({
        error: "Response error: 400",
        status_code: 400,
        body: { message: "Message malformed: Bad for", errors },
      })
    ).toEqual({ message: "Message malformed: Bad for", errors });

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
