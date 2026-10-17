import type { Auth, getAuthOptions } from "home-assistant-js-websocket";
import {
  ERR_INVALID_AUTH,
  ERR_INVALID_AUTH_CALLBACK,
  getAuth,
} from "home-assistant-js-websocket";

/**
 * Remove the data of an authorize redirect (QueryCallbackData in
 * https://github.com/home-assistant/home-assistant-js-websocket/blob/master/lib/auth.ts).
 * Returns whether anything was removed.
 */
export const removeAuthCallbackParams = (
  searchParams: URLSearchParams
): boolean => {
  if (!searchParams.has("auth_callback")) {
    return false;
  }
  searchParams.delete("auth_callback");
  searchParams.delete("code");
  searchParams.delete("state");
  searchParams.delete("storeToken");
  return true;
};

/**
 * Like `getAuth`, but when the authorize callback in the URL is refused (its
 * code was already used or has expired), call `dropCallback` to remove it from
 * the URL and continue with the stored tokens or a new login, instead of
 * failing on every reload.
 */
export const getAuthSkippingRefusedCallback = async (
  options: getAuthOptions,
  dropCallback: () => void
): Promise<Auth> => {
  try {
    return await getAuth(options);
  } catch (err: any) {
    if (
      (err !== ERR_INVALID_AUTH && err !== ERR_INVALID_AUTH_CALLBACK) ||
      !new URLSearchParams(location.search).has("auth_callback")
    ) {
      throw err;
    }
    dropCallback();
    return getAuth(options);
  }
};
