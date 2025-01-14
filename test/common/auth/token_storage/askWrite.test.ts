import { afterEach, describe, expect, test, vi } from "vitest";

let askWrite;

describe("token_storage.askWrite", () => {
  afterEach(() => {
    vi.resetModules();
  });

  test("askWrite", async () => {
    vi.stubGlobal(
      "window.__tokenCache",
      (window.__tokenCache = {
        tokens: undefined,
        writeEnabled: true,
      })
    );

    ({ askWrite } = await import("../../../../src/common/auth/token_storage"));
    expect(askWrite()).toBe(false);
  });

  test("askWrite prefilled token", async () => {
    vi.stubGlobal(
      "window.__tokenCache",
      (window.__tokenCache = {
        tokens: {
          access_token: "test",
          expires: 1800,
          expires_in: 1800,
          hassUrl: "http://localhost",
          refresh_token: "refresh",
          clientId: "client",
        },
        writeEnabled: undefined,
      })
    );

    ({ askWrite } = await import("../../../../src/common/auth/token_storage"));
    expect(askWrite()).toBe(true);
  });

  test("askWrite prefilled token, write enabled", async () => {
    vi.stubGlobal(
      "window.__tokenCache",
      (window.__tokenCache = {
        tokens: {
          access_token: "test",
          expires: 1800,
          expires_in: 1800,
          hassUrl: "http://localhost",
          refresh_token: "refresh",
          clientId: "client",
        },
        writeEnabled: true,
      })
    );

    ({ askWrite } = await import("../../../../src/common/auth/token_storage"));
    expect(askWrite()).toBe(false);
  });
});
