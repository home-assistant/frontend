/**
 * Auth class that connects to a native app for authentication.
 */
import { Auth } from "home-assistant-js-websocket";
import { ExternalMessaging, EMMessage } from "./external_messaging";

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
          postMessage(payload: EMMessage);
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

export class ExternalAuth extends Auth {
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

  private _tokenCallbackPromise?: Promise<RefreshTokenResponse>;

  public async refreshAccessToken(force?: boolean) {
    if (this._tokenCallbackPromise && !force) {
      try {
        await this._tokenCallbackPromise;
        return;
      } catch (err: any) {
        // _tokenCallbackPromise is in a rejected state
        // Clear the _tokenCallbackPromise and go on refreshing access token
        this._tokenCallbackPromise = undefined;
      }
    }
    const payload: GetExternalAuthPayload = {
      callback: CALLBACK_SET_TOKEN,
    };
    if (force) {
      payload.force = true;
    }

    this._tokenCallbackPromise = new Promise<RefreshTokenResponse>(
      (resolve, reject) => {
        window[CALLBACK_SET_TOKEN] = (success, data) =>
          success ? resolve(data) : reject(data);
      }
    );

    // we sleep 1 microtask to get the promise to actually set it on the window object.
    await Promise.resolve();

    if (window.externalApp) {
      window.externalApp.getExternalAuth(JSON.stringify(payload));
    } else {
      window.webkit!.messageHandlers.getExternalAuth.postMessage(payload);
    }

    const tokens = await this._tokenCallbackPromise;

    this.data.access_token = tokens.access_token;
    this.data.expires = tokens.expires_in * 1000 + Date.now();
    this._tokenCallbackPromise = undefined;
  }

  public async revoke() {
    const payload: BasePayload = { callback: CALLBACK_REVOKE_TOKEN };

    const callbackPromise = new Promise((resolve, reject) => {
      window[CALLBACK_REVOKE_TOKEN] = (success, data) =>
        success ? resolve(data) : reject(data);
    });

    // we sleep 1 microtask to get the promise to actually set it on the window object.
    await Promise.resolve();

    if (window.externalApp) {
      window.externalApp.revokeExternalAuth(JSON.stringify(payload));
    } else {
      window.webkit!.messageHandlers.revokeExternalAuth.postMessage(payload);
    }

    await callbackPromise;
  }
}

export const createExternalAuth = async (hassUrl: string) => {
  const auth = new ExternalAuth(hassUrl);
  if (
    window.externalApp?.externalBus ||
    (window.webkit && window.webkit.messageHandlers.externalBus)
  ) {
    auth.external = new ExternalMessaging();
    await auth.external.attach();
  }
  return auth;
};
