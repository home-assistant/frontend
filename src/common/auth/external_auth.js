/**
 * Auth class that connects to a native app for authentication.
 */
import { Auth } from 'home-assistant-js-websocket';

const CALLBACK_METHOD = 'externalAuthSetToken';

export default class ExternalAuth extends Auth {
  constructor(hassUrl) {
    super();

    this.data = {
      hassUrl,
      access_token: '',
      // This will trigger connection to do a refresh right away
      expires: 0,
    };
  }

  async refreshAccessToken() {
    const meth = window.externalApp ?
      window.externalApp.getExternalAuth :
      window.webkit.messageHandlers.getExternalAuth.postMessage;

    const responseProm = new Promise((resolve) => { window[CALLBACK_METHOD] = resolve; });

    // Allow promise to set resolve on window object.
    await 0;

    meth({ callback: CALLBACK_METHOD });

    // Response we expect back:
    // {
    //   "access_token": "qwere",
    //   "expires_in": 1800
    // }
    const tokens = await responseProm;

    this.data.access_token = tokens.access_token;
    this.data.expires = (tokens.expires_in * 1000) + Date.now();
  }
}
