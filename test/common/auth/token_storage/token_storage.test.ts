import { describe, it, expect, test, vi, afterEach, beforeEach } from "vitest";
import type { AuthData } from "home-assistant-js-websocket";

describe("token_storage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "window.__tokenCache",
      (window.__tokenCache = {
        tokens: undefined,
        writeEnabled: undefined,
      })
    );
  });

  afterEach(() => {
    vi.resetModules();
  });

  test("initialize tokenCache", async () => {
    vi.stubGlobal(
      "window.__tokenCache",
      (window.__tokenCache = undefined as any)
    );

    await import("../../../../src/common/auth/token_storage");

    expect(window.__tokenCache).toEqual({
      tokens: undefined,
      writeEnabled: undefined,
    });
  });

  test("should load tokens", async () => {
    const tokens: AuthData = {
      access_token: "test",
      expires: 1800,
      expires_in: 1800,
      hassUrl: "http://localhost",
      refresh_token: "refresh",
      clientId: "client",
    };

    window.localStorage = {
      getItem: vi.fn(() => JSON.stringify(tokens)),
    } as unknown as Storage;

    const { loadTokens } = await import(
      "../../../../src/common/auth/token_storage"
    );

    const loadedTokens = loadTokens();
    expect(loadedTokens).toEqual(tokens);

    expect(window.__tokenCache.tokens).toEqual(tokens);
    expect(window.__tokenCache.writeEnabled).toBe(true);
    expect(window.localStorage.getItem).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem).toHaveBeenCalledWith("hassTokens");
  });

  test("should load null tokens", async () => {
    window.localStorage = {
      getItem: vi.fn(() => null),
    } as unknown as Storage;

    const { loadTokens } = await import(
      "../../../../src/common/auth/token_storage"
    );

    const loadedTokens = loadTokens();
    expect(loadedTokens).toEqual(null);

    expect(window.__tokenCache.tokens).toEqual(null);
    expect(window.__tokenCache.writeEnabled).toBe(undefined);
    expect(window.localStorage.getItem).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem).toHaveBeenCalledWith("hassTokens");
  });

  it("should enable write", async () => {
    const { enableWrite } = await import(
      "../../../../src/common/auth/token_storage"
    );
    enableWrite();
    expect(window.__tokenCache.writeEnabled).toBe(true);
  });

  it("should enable write with tokens", async () => {
    vi.stubGlobal(
      "window.__tokenCache",
      (window.__tokenCache = {
        tokens: "testToken" as any,
      })
    );

    window.localStorage = {
      setItem: vi.fn(),
    } as unknown as Storage;

    const { enableWrite } = await import(
      "../../../../src/common/auth/token_storage"
    );

    enableWrite();
    expect(window.__tokenCache.writeEnabled).toBe(true);
    expect(window.localStorage.setItem).toHaveBeenCalledOnce();
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "hassTokens",
      JSON.stringify("testToken")
    );
  });
});
