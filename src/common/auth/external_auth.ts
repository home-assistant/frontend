/**
 * Auth class that connects to a native app for authentication.
 */
import { Auth } from "home-assistant-js-websocket";

const CALLBACK_SET_TOKEN = "externalAuthSetToken";
const CALLBACK_REVOKE_TOKEN = "externalAuthRevokeToken";

interface BasePayload {
  callback: string;
}

interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

declare global {
  interface Window {
    externalApp?: {
      getExternalAuth(payload: BasePayload);
      revokeExternalAuth(payload: BasePayload);
    };
    webkit?: {
      messageHandlers: {
        getExternalAuth: {
          postMessage(payload: BasePayload);
        };
        revokeExternalAuth: {
          postMessage(payload: BasePayload);
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

export default class ExternalAuth extends Auth {
  constructor(hassUrl) {
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

  public async refreshAccessToken() {
    const responseProm = new Promise<RefreshTokenResponse>(
      (resolve, reject) => {
        window[CALLBACK_SET_TOKEN] = (success, data) =>
          success ? resolve(data) : reject(data);
      }
    );

    // Allow promise to set resolve on window object.
    await 0;

    const callbackPayload = { callback: CALLBACK_SET_TOKEN };

    if (window.externalApp) {
      window.externalApp.getExternalAuth(JSON.stringify(callbackPayload));
    } else {
      window.webkit!.messageHandlers.getExternalAuth.postMessage(
        callbackPayload
      );
    }

    const tokens = await responseProm;

    this.data.access_token = tokens.access_token;
    this.data.expires = tokens.expires_in * 1000 + Date.now();
  }

  public async revoke() {
    const responseProm = new Promise((resolve, reject) => {
      window[CALLBACK_REVOKE_TOKEN] = (success, data) =>
        success ? resolve(data) : reject(data);
    });

    // Allow promise to set resolve on window object.
    await 0;

    const callbackPayload = { callback: CALLBACK_REVOKE_TOKEN };

    if (window.externalApp) {
      window.externalApp.revokeExternalAuth(callbackPayload);
    } else {
      window.webkit!.messageHandlers.revokeExternalAuth.postMessage(
        callbackPayload
      );
    }

    await responseProm;
  }
}
