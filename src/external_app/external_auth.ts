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
          postMessage(payload: BasePayload);
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

export default class ExternalAuth extends Auth {
  public external = new ExternalMessaging();

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
    this.external.attach();
  }

  public async refreshAccessToken() {
    const callbackPayload = { callback: CALLBACK_SET_TOKEN };

    if (window.externalApp) {
      window.externalApp.getExternalAuth(JSON.stringify(callbackPayload));
    } else {
      window.webkit!.messageHandlers.getExternalAuth.postMessage(
        callbackPayload
      );
    }

    const tokens = await new Promise<RefreshTokenResponse>(
      (resolve, reject) => {
        window[CALLBACK_SET_TOKEN] = (success, data) =>
          success ? resolve(data) : reject(data);
      }
    );

    this.data.access_token = tokens.access_token;
    this.data.expires = tokens.expires_in * 1000 + Date.now();
  }

  public async revoke() {
    const callbackPayload = { callback: CALLBACK_REVOKE_TOKEN };

    if (window.externalApp) {
      window.externalApp.revokeExternalAuth(JSON.stringify(callbackPayload));
    } else {
      window.webkit!.messageHandlers.revokeExternalAuth.postMessage(
        callbackPayload
      );
    }

    await new Promise((resolve, reject) => {
      window[CALLBACK_REVOKE_TOKEN] = (success, data) =>
        success ? resolve(data) : reject(data);
    });
  }
}
