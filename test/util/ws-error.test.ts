import { describe, expect, it } from "vitest";
import { error as errorMessage } from "home-assistant-js-websocket/dist/messages";
import { ERR_CONNECTION_LOST } from "home-assistant-js-websocket";
import { getWsErrorMessage, isWsErrorCode } from "../../src/util/ws-error";

describe("getWsErrorMessage", () => {
  it("reads the error field of a failed command", () => {
    expect(
      getWsErrorMessage({
        code: "unknown_error",
        message: "Failed to remove device entry, rejected by integration",
      })
    ).toBe("Failed to remove device entry, rejected by integration");
  });

  it("ignores connection-level failures in both their shapes", () => {
    // A dropped socket is not a message to render: the global disconnect toast
    // already covers it, so callers suppress it rather than showing an alert.
    // The client rejects with a bare code, or the whole result frame.
    expect(getWsErrorMessage(ERR_CONNECTION_LOST)).toBeUndefined();
    expect(
      getWsErrorMessage(errorMessage(ERR_CONNECTION_LOST, "Connection lost"))
    ).toBeUndefined();
  });

  it("falls back to Error and string rejections", () => {
    expect(getWsErrorMessage(new Error("boom"))).toBe("boom");
    expect(getWsErrorMessage("boom")).toBe("boom");
    expect(getWsErrorMessage(undefined)).toBeUndefined();
  });
});

describe("isWsErrorCode", () => {
  it("matches a Core error code", () => {
    const err = { code: "not_found", message: "Not found" };
    expect(isWsErrorCode(err, "not_found")).toBe(true);
    expect(isWsErrorCode(err, "unknown_error")).toBe(false);
  });

  it("does not match a thrown Error that merely mentions the code", () => {
    // The check this replaced was `err.message.includes("not_found")`, which
    // never matched a real rejection and would match unrelated text.
    expect(isWsErrorCode(new Error("not_found"), "not_found")).toBe(false);
  });

  it("does not match connection-level failures", () => {
    // Those carry the client's numeric codes, never a Core code.
    expect(
      isWsErrorCode(
        errorMessage(ERR_CONNECTION_LOST, "Connection lost"),
        "not_found"
      )
    ).toBe(false);
    expect(isWsErrorCode(ERR_CONNECTION_LOST, "not_found")).toBe(false);
  });
});
