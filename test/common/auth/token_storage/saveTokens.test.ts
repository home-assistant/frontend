import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AuthData } from "home-assistant-js-websocket";
import { FallbackStorage } from "../../../test_helper/local-storage-fallback";

let saveTokens;

describe("token_storage.saveTokens", () => {
  beforeEach(() => {
    window.localStorage = new FallbackStorage();
  });

  afterEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  test("saveTokens", async () => {
    const tokens: AuthData = {
      access_token: "test",
      expires: 1800,
      expires_in: 1800,
      hassUrl: "http://localhost",
      refresh_token: "refresh",
      clientId: "client",
    };

    vi.stubGlobal(
      "window.__tokenCache",
      (window.__tokenCache = {
        tokens: undefined,
        writeEnabled: undefined,
      })
    );

    ({ saveTokens } = await import(
      "../../../../src/common/auth/token_storage"
    ));
    saveTokens(tokens);
    expect(window.__tokenCache.tokens).toEqual(tokens);
  });

  test("saveTokens write enabled", async () => {
    const tokens: AuthData = {
      access_token: "test",
      expires: 1800,
      expires_in: 1800,
      hassUrl: "http://localhost",
      refresh_token: "refresh",
      clientId: "client",
    };

    vi.stubGlobal(
      "window.__tokenCache",
      (window.__tokenCache = {
        tokens: undefined,
        writeEnabled: undefined,
      })
    );

    const extractSearchParamSpy = vi.fn().mockReturnValue("true");

    vi.doMock("../../../../src/common/url/search-params", () => ({
      extractSearchParam: extractSearchParamSpy,
    }));
    const setItemSpy = vi.fn();
    window.localStorage.setItem = setItemSpy;

    ({ saveTokens } = await import(
      "../../../../src/common/auth/token_storage"
    ));
    saveTokens(tokens);
    expect(window.__tokenCache.tokens).toEqual(tokens);
    expect(window.__tokenCache.writeEnabled).toBe(true);
    expect(extractSearchParamSpy).toHaveBeenCalledOnce();
    expect(extractSearchParamSpy).toHaveBeenCalledWith("storeToken");
    expect(setItemSpy).toHaveBeenCalledOnce();
    expect(setItemSpy).toHaveBeenCalledWith(
      "hassTokens",
      JSON.stringify(tokens)
    );
  });

  test("saveTokens write enabled full storage", async () => {
    const tokens: AuthData = {
      access_token: "test",
      expires: 1800,
      expires_in: 1800,
      hassUrl: "http://localhost",
      refresh_token: "refresh",
      clientId: "client",
    };

    vi.stubGlobal(
      "window.__tokenCache",
      (window.__tokenCache = {
        tokens: undefined,
        writeEnabled: true,
      })
    );

    const extractSearchParamSpy = vi.fn();

    vi.doMock("../../../../src/common/url/search-params", () => ({
      extractSearchParam: extractSearchParamSpy,
    }));

    const setItemSpy = vi.fn(() => {
      throw new Error("Full storage");
    });

    window.localStorage.setItem = setItemSpy;

    // eslint-disable-next-line no-global-assign
    console = {
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Console;

    ({ saveTokens } = await import(
      "../../../../src/common/auth/token_storage"
    ));
    saveTokens(tokens);
    expect(window.__tokenCache.tokens).toEqual(tokens);
    expect(window.__tokenCache.writeEnabled).toBe(true);
    expect(extractSearchParamSpy).toBeCalledTimes(0);
    expect(setItemSpy).toHaveBeenCalledOnce();
    expect(setItemSpy).toHaveBeenCalledWith(
      "hassTokens",
      JSON.stringify(tokens)
    );
    // eslint-disable-next-line no-console
    expect(console.warn).toHaveBeenCalledOnce();
    // eslint-disable-next-line no-console
    expect(console.warn).toHaveBeenCalledWith(
      "Failed to store tokens; Are you in private mode or is your storage full?"
    );
    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalledOnce();
  });
});
