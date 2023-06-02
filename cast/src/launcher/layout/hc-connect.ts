import "@material/mwc-button";
import { mdiCastConnected, mdiCast } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import {
  Auth,
  Connection,
  createConnection,
  ERR_CANNOT_CONNECT,
  ERR_HASS_HOST_REQUIRED,
  ERR_INVALID_AUTH,
  ERR_INVALID_HTTPS_TO_HTTP,
  getAuth,
  getAuthOptions,
} from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { CastManager, getCastManager } from "../../../../src/cast/cast_manager";
import { castSendShowDemo } from "../../../../src/cast/receiver_messages";
import {
  loadTokens,
  saveTokens,
} from "../../../../src/common/auth/token_storage";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/layouts/hass-loading-screen";
import { registerServiceWorker } from "../../../../src/util/register-service-worker";
import "./hc-layout";

const seeFAQ = (qid) => html`
  See <a href="./faq.html${qid ? `#${qid}` : ""}">the FAQ</a> for more
  information.
`;
const translateErr = (err) =>
  err === ERR_CANNOT_CONNECT
    ? "Unable to connect"
    : err === ERR_HASS_HOST_REQUIRED
    ? "Please enter a Home Assistant URL."
    : err === ERR_INVALID_HTTPS_TO_HTTP
    ? html`
        Cannot connect to Home Assistant instances over "http://".
        ${seeFAQ("https")}
      `
    : `Unknown error (${err}).`;

const INTRO = html`
  <p>
    Home Assistant Cast allows you to cast your Home Assistant installation to
    Chromecast video devices and to Google Assistant devices with a screen.
  </p>
  <p>
    For more information, see the
    <a href="./faq.html">frequently asked questions</a>.
  </p>
`;

@customElement("hc-connect")
export class HcConnect extends LitElement {
  @state() private loading = false;

  // If we had stored credentials but we cannot connect,
  // show a screen asking retry or logout.
  @state() private cannotConnect = false;

  @state() private error?: string | TemplateResult;

  @state() private auth?: Auth;

  @state() private connection?: Connection;

  @state() private castManager?: CastManager | null;

  private openDemo = false;

  protected render(): TemplateResult {
    if (this.cannotConnect) {
      const tokens = loadTokens();
      return html`
        <hc-layout>
          <div class="card-content">
            Unable to connect to ${tokens!.hassUrl}.
          </div>
          <div class="card-actions">
            <a href="/">
              <mwc-button> Retry </mwc-button>
            </a>
            <div class="spacer"></div>
            <mwc-button @click=${this._handleLogout}>Log out</mwc-button>
          </div>
        </hc-layout>
      `;
    }

    if (this.castManager === undefined || this.loading) {
      return html` <hass-loading-screen no-toolbar></hass-loading-screen> `;
    }

    if (this.castManager === null) {
      return html`
        <hc-layout>
          <div class="card-content">
            ${INTRO}
            <p class="error">
              The Cast API is not available in your browser.
              ${seeFAQ("browser")}
            </p>
          </div>
        </hc-layout>
      `;
    }

    if (!this.auth) {
      return html`
        <hc-layout>
          <div class="card-content">
            ${INTRO}
            <p>
              To get started, enter your Home Assistant URL and click authorize.
              If you want a preview instead, click the show demo button.
            </p>
            <p>
              <paper-input
                label="Home Assistant URL"
                placeholder="https://abcdefghijklmnop.ui.nabu.casa"
                @keydown=${this._handleInputKeyDown}
              ></paper-input>
            </p>
            ${this.error ? html` <p class="error">${this.error}</p> ` : ""}
          </div>
          <div class="card-actions">
            <mwc-button @click=${this._handleDemo}>
              Show Demo
              <ha-svg-icon
                .path=${this.castManager.castState === "CONNECTED"
                  ? mdiCastConnected
                  : mdiCast}
              ></ha-svg-icon>
            </mwc-button>
            <div class="spacer"></div>
            <mwc-button @click=${this._handleConnect}>Authorize</mwc-button>
          </div>
        </hc-layout>
      `;
    }

    return html`
      <hc-cast
        .connection=${this.connection}
        .auth=${this.auth}
        .castManager=${this.castManager}
      ></hc-cast>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    import("./hc-cast");

    getCastManager().then(
      async (mgr) => {
        this.castManager = mgr;
        mgr.addEventListener("connection-changed", () => {
          this.requestUpdate();
        });
        mgr.addEventListener("state-changed", () => {
          if (this.openDemo && mgr.castState === "CONNECTED" && !this.auth) {
            castSendShowDemo(mgr);
          }
        });

        if (location.search.indexOf("auth_callback=1") !== -1) {
          this._tryConnection("auth-callback");
        } else if (loadTokens()) {
          this._tryConnection("saved-tokens");
        }
      },
      () => {
        this.castManager = null;
      }
    );
    registerServiceWorker(this, false);
  }

  private async _handleDemo() {
    this.openDemo = true;
    if (this.castManager!.status && !this.castManager!.status.showDemo) {
      castSendShowDemo(this.castManager!);
    } else {
      this.castManager!.requestSession();
    }
  }

  private _handleInputKeyDown(ev: KeyboardEvent) {
    // Handle pressing enter.
    if (ev.key === "Enter") {
      this._handleConnect();
    }
  }

  private async _handleConnect() {
    const inputEl = this.shadowRoot!.querySelector("paper-input")!;
    const value = inputEl.value || "";
    this.error = undefined;

    if (value === "") {
      this.error = "Please enter a Home Assistant URL.";
      return;
    }
    if (value.indexOf("://") === -1) {
      this.error =
        "Please enter your full URL, including the protocol part (https://).";
      return;
    }

    let url: URL;
    try {
      url = new URL(value);
    } catch (err: any) {
      this.error = "Invalid URL";
      return;
    }

    if (url.protocol === "http:" && url.hostname !== "localhost") {
      this.error = translateErr(ERR_INVALID_HTTPS_TO_HTTP);
      return;
    }
    await this._tryConnection("user-request", `${url.protocol}//${url.host}`);
  }

  private async _tryConnection(
    init: "auth-callback" | "user-request" | "saved-tokens",
    hassUrl?: string
  ) {
    const options: getAuthOptions = {
      saveTokens,
      loadTokens: () => Promise.resolve(loadTokens()),
    };
    if (hassUrl) {
      options.hassUrl = hassUrl;
    }
    let auth: Auth;

    try {
      this.loading = true;
      auth = await getAuth(options);
    } catch (err: any) {
      if (init === "saved-tokens" && err === ERR_CANNOT_CONNECT) {
        this.cannotConnect = true;
        return;
      }
      this.error = translateErr(err);
      this.loading = false;
      return;
    } finally {
      // Clear url if we have a auth callback in url.
      if (location.search.includes("auth_callback=1")) {
        history.replaceState(null, "", location.pathname);
      }
    }

    let conn: Connection;

    try {
      conn = await createConnection({ auth });
    } catch (err: any) {
      // In case of saved tokens, silently solve problems.
      if (init === "saved-tokens") {
        if (err === ERR_CANNOT_CONNECT) {
          this.cannotConnect = true;
        } else if (err === ERR_INVALID_AUTH) {
          saveTokens(null);
        }
      } else {
        this.error = translateErr(err);
      }

      return;
    } finally {
      this.loading = false;
    }

    this.auth = auth;
    this.connection = conn;
    this.castManager!.auth = auth;
  }

  private async _handleLogout() {
    try {
      saveTokens(null);
      location.reload();
    } catch (err: any) {
      alert("Unable to log out!");
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .card-content a {
        color: var(--primary-color);
      }
      .card-actions a {
        text-decoration: none;
      }
      .error {
        color: red;
        font-weight: bold;
      }

      .error a {
        color: darkred;
      }

      mwc-button ha-svg-icon {
        margin-left: 8px;
      }

      .spacer {
        flex: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-connect": HcConnect;
  }
}
