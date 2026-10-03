import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLogMessage } from "../../src/resources/log-message";

const fromError = vi.hoisted(() => vi.fn());

vi.mock("stacktrace-js", () => ({ fromError }));

describe("createLogMessage", () => {
  beforeEach(() => {
    fromError.mockReset();
  });

  it("includes the error message and parsed stack frames", async () => {
    fromError.mockResolvedValue([
      { fileName: "https://example.com/foo.js", toString: () => "at foo.js" },
    ]);
    const error = new Error("boom");

    const message = await createLogMessage(error);

    expect(message).toContain("Error: boom");
    expect(message).toContain("at foo.js");
  });

  it("does not throw when stacktrace-js cannot parse the stack", async () => {
    fromError.mockRejectedValue(new Error("Cannot parse given Error object"));
    const error = new Error("boom");
    error.stack = "Error: boom\n    at <anonymous>";

    const message = await createLogMessage(error);

    expect(message).toContain("Error: boom");
    // Falls back to the raw stack instead of crashing the logger.
    expect(message).toContain("at <anonymous>");
  });

  it("falls back to the provided stack fallback when no stack is available", async () => {
    fromError.mockRejectedValue(new Error("Cannot parse given Error object"));
    const error = new Error("boom");
    error.stack = undefined;

    const message = await createLogMessage(
      error,
      undefined,
      undefined,
      "@unknown:0:0"
    );

    expect(message).toContain("@unknown:0:0");
  });
});
