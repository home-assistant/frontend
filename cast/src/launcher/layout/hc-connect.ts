import {
  LitElement,
  customElement,
  property,
  TemplateResult,
  html,
  CSSResult,
  css,
} from "lit-element";
import { getAuth, createConnection, Auth } from "home-assistant-js-websocket";
import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import {
  loadTokens,
  saveTokens,
  askWrite,
  enableWrite,
} from "../../../../src/common/auth/token_storage";
import {
  LovelaceConfig,
  getLovelaceCollection,
} from "../../../../src/data/lovelace";
import { CastManager, getCastManager } from "../../../../src/cast/cast_manager";
import {
  ensureConnectedCastSession,
  castSendShowLovelaceView,
} from "../../../../src/cast/receiver_messages";

@customElement("hc-connect")
export class HcConnect extends LitElement {
  @property() private error?: string;
  @property() private askWrite = false;
  @property() private lovelaceConfig?: LovelaceConfig;
  @property() private auth?: Auth;
  @property() private castManager?: CastManager | null;

  protected render(): TemplateResult | void {
    if (this.castManager === undefined) {
      return html`
        Loading…
      `;
    }

    if (this.castManager === null) {
      return html`
        The Cast API is not available in your browser.
      `;
    }

    if (!this.auth) {
      return html`
        <p>
          Please authorize with your local Home Assistant installation to start
          casting.
        </p>
        ${this.error
          ? html`
              <p class="error">${this.error}</p>
            `
          : ""}
        <p>
          <paper-input
            label="Home Assistant URL"
            value="http://localhost:8123"
          ></paper-input>
          <mwc-button @click=${this._handleConnect}>Connect</mwc-button>
        </p>
      `;
    }

    if (!this.lovelaceConfig) {
      return html`
        Loading…
      `;
    }

    return html`
      <div class="toolbar">
        <mwc-button @click=${this._handleLogout}>Log out</mwc-button>
      </div>

      ${this.askWrite
        ? html`
            <p>
              Do you want to store your login information for your next visit?
              <mwc-button @click=${this._handleSaveTokens}>
                SAVE AUTH
              </mwc-button>
            </p>
          `
        : ""}
      ${this.castManager.status
        ? html`
            <p>
              Select a Lovelace view to show on your Chromecast:

              <select @change=${this._handleShowLovelace}>
                <option></option>
                ${this.lovelaceConfig.views
                  .filter((view) => view.path)
                  .map(
                    (view) => html`
                      <option value=${view.path}>${view.title}</option>
                    `
                  )}
              </select>
            </p>
          `
        : html`
            <p>
              Click the Chromecast button to launch Home Assistant Cast.
              <google-cast-launcher></google-cast-launcher>
            </p>
          `}
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    getCastManager().then(
      async (mgr) => {
        this.castManager = mgr;
        mgr.addEventListener("connection-changed", () => {
          this.requestUpdate();
        });
        if (location.search.indexOf("auth_callback=1") !== -1 || loadTokens()) {
          this._handleConnect();
        }
      },
      () => {
        this.castManager = null;
      }
    );
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (this.castManager && this.castManager.status) {
      this.shadowRoot!.querySelector("select")!.value = this.castManager
        .castConnectedToOurHass
        ? this.castManager.status.lovelacePath || ""
        : "";
    }
  }

  private async _handleConnect() {
    const inputEl = this.shadowRoot!.querySelector("paper-input");
    const hassUrl = inputEl ? inputEl.value! : "";
    let auth: Auth;

    try {
      auth = await getAuth({
        hassUrl,
        saveTokens,
        loadTokens: () => Promise.resolve(loadTokens()),
      });
    } catch (err) {
      this.error = err;
      return;
    }

    const conn = await createConnection({ auth });

    // Clear url if we have been able to establish a connection
    if (location.search.includes("auth_callback=1")) {
      history.replaceState(null, "", location.pathname);
    }

    this.auth = auth;

    getLovelaceCollection(conn).subscribe((config) => {
      this.lovelaceConfig = config;
    });

    this.askWrite = askWrite();
    this.castManager!.auth = auth;
  }

  private async _handleSaveTokens() {
    enableWrite();
    this.askWrite = false;
  }

  private async _handleShowLovelace() {
    await ensureConnectedCastSession(this.castManager!, this.auth!);
    const view = this.shadowRoot!.querySelector("select")!.value;
    if (!view) {
      return;
    }
    castSendShowLovelaceView(this.castManager!, view);
  }

  private async _handleLogout() {
    try {
      await this.auth!.revoke();
      this.auth = undefined;
    } catch (err) {
      alert("Unable to log out!");
    }
  }

  static get styles(): CSSResult {
    return css`
      .error {
        color: red;
        font-weight: bold;
      }

      .toolbar {
        text-align: right;
      }

      google-cast-launcher {
        display: inline-block;
        height: 24px;
        width: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-connect": HcConnect;
  }
}
