import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AuthData } from "home-assistant-js-websocket";
import { ERR_INVALID_AUTH } from "home-assistant-js-websocket";
import {
  getAuthSkippingRefusedCallback,
  removeAuthCallbackParams,
} from "../../../src/common/auth/get_auth";

const dropCallback = () => {
  const searchParams = new URLSearchParams(location.search);
  removeAuthCallbackParams(searchParams);
  history.replaceState(null, "", `${location.pathname}?${searchParams}`);
};

const HASS_URL = `${location.protocol}//${location.host}`;
const CLIENT_ID = `${HASS_URL}/`;

const storedTokens: AuthData = {
  hassUrl: HASS_URL,
  clientId: CLIENT_ID,
  access_token: "stored-access",
  refresh_token: "stored-refresh",
  expires: Date.now() + 1800000,
  expires_in: 1800,
};

const callbackSearch = () =>
  `?auth_callback=1&code=used-code&state=${encodeURIComponent(
    btoa(JSON.stringify({ hassUrl: HASS_URL, clientId: CLIENT_ID }))
  )}`;

describe("getAuthSkippingRefusedCallback", () => {
  beforeEach(() => {
    // Core refuses a code that was already used or has expired
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            '{"error":"invalid_request","error_description":"Invalid code"}',
            { status: 400 }
          )
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    history.replaceState(null, "", "/");
  });

  test("drops a refused callback and uses the stored tokens", async () => {
    history.replaceState(null, "", `/lovelace/0${callbackSearch()}&edit=1`);

    const auth = await getAuthSkippingRefusedCallback(
      {
        hassUrl: HASS_URL,
        limitHassInstance: true,
        loadTokens: async () => storedTokens,
      },
      dropCallback
    );

    expect(auth.data.access_token).toBe("stored-access");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(location.pathname).toBe("/lovelace/0");
    expect(location.search).toBe("?edit=1");
  });

  test("rethrows invalid auth when there is no callback in the URL", async () => {
    vi.mocked(fetch).mockClear();

    await expect(
      getAuthSkippingRefusedCallback(
        {
          hassUrl: HASS_URL,
          authCode: "refused-code",
          loadTokens: async () => storedTokens,
        },
        dropCallback
      )
    ).rejects.toBe(ERR_INVALID_AUTH);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
