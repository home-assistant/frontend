import { Auth } from "home-assistant-js-websocket";

export const fetchWithAuth = async (
  auth: Auth,
  input: RequestInfo,
  init: RequestInit = {}
) => {
  if (auth.expired) {
    await auth.refreshAccessToken();
  }
  init.credentials = "same-origin";
  if (!init.headers) {
    init.headers = {};
  }
  if (!init.headers) {
    init.headers = {};
  }
  // @ts-ignore
  init.headers.authorization = `Bearer ${auth.accessToken}`;
  return fetch(input, init);
};
