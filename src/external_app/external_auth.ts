/**
 * Auth class that connects to a native app for authentication.
 */
import { Auth } from "home-assistant-js-websocket";
import { ExternalMessaging, InternalMessage } from "./external_messaging";

const CALLBACK_SET_TOKEN = "externalAuthSetToken";
const CALLBACK_REVOKE_TOKEN = "externalAuthRevokeToken";

interface BasePayload {
  callback: string;
}

interface GetExternalAuthPayload extends BasePayload {
  force?: boolean;
}

interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

declare global {
  interface Window {
    externalApp?: {
      getExternalAuth(payload: string);
      revokeExternalAuth(payload: string);
      externalBus(payload: string);
    };
    webkit?: {
      messageHandlers: {
        getExternalAuth: {
          postMessage(payload: GetExternalAuthPayload);
        };
        revokeExternalAuth: {
          postMessage(payload: BasePayload);
        };
        externalBus: {
          postMessage(payload: InternalMessage);
        };
      };
    };
  }
}

if (!window.externalApp && !window.webkit) {
  throw new Error(
    "External auth requires either externalApp or webkit defined on Window object."
  );
}

class ExternalAuth extends Auth {
  public external?: ExternalMessaging;

  constructor(hassUrl: string) {
    super({
      hassUrl,
      clientId: "",
      refresh_token: "",
      access_token: "",
      expires_in: 0,
      // This will trigger connection to do a refresh right away
      expires: 0,
    });
  }

  public async refreshAccessToken(force?: boolean) {
    const payload: GetExternalAuthPayload = {
      callback: CALLBACK_SET_TOKEN,
    };
    if (force) {
      payload.force = true;
    }

    const callbackPromise = new Promise<RefreshTokenResponse>(
      (resolve, reject) => {
        window[CALLBACK_SET_TOKEN] = (success, data) =>
          success ? resolve(data) : reject(data);
      }
    );

    await 0;

    if (window.externalApp) {
      window.externalApp.getExternalAuth(JSON.stringify(payload));
    } else {
      window.webkit!.messageHandlers.getExternalAuth.postMessage(payload);
    }

    const tokens = await callbackPromise;

    this.data.access_token = tokens.access_token;
    this.data.expires = tokens.expires_in * 1000 + Date.now();
  }

  public async revoke() {
    const payload: BasePayload = { callback: CALLBACK_REVOKE_TOKEN };

    const callbackPromise = new Promise((resolve, reject) => {
      window[CALLBACK_REVOKE_TOKEN] = (success, data) =>
        success ? resolve(data) : reject(data);
    });

    await 0;

    if (window.externalApp) {
      window.externalApp.revokeExternalAuth(JSON.stringify(payload));
    } else {
      window.webkit!.messageHandlers.revokeExternalAuth.postMessage(payload);
    }

    await callbackPromise;
  }
}

export const createExternalAuth = (hassUrl: string) => {
  const auth = new ExternalAuth(hassUrl);
  if (
    (window.externalApp && window.externalApp.externalBus) ||
    (window.webkit && window.webkit.messageHandlers.externalBus)
  ) {
    auth.external = new ExternalMessaging();
    auth.external.attach();
  }
  return auth;
};
