import "@material/mwc-button/mwc-button";
import { mdiCast, mdiCastConnected } from "@mdi/js";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-listbox/paper-listbox";
import { Auth, Connection } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { CastManager } from "../../../../src/cast/cast_manager";
import {
  castSendShowLovelaceView,
  ensureConnectedCastSession,
} from "../../../../src/cast/receiver_messages";
import {
  askWrite,
  enableWrite,
  saveTokens,
} from "../../../../src/common/auth/token_storage";
import { atLeastVersion } from "../../../../src/common/config/version";
import { toggleAttribute } from "../../../../src/common/dom/toggle_attribute";
import "../../../../src/components/ha-icon";
import "../../../../src/components/ha-svg-icon";
import {
  getLegacyLovelaceCollection,
  getLovelaceCollection,
  LovelaceConfig,
} from "../../../../src/data/lovelace";
import "../../../../src/layouts/hass-loading-screen";
import { generateDefaultViewConfig } from "../../../../src/panels/lovelace/common/generate-lovelace-config";
import "./hc-layout";

@customElement("hc-cast")
class HcCast extends LitElement {
  @property() public auth!: Auth;

  @property() public connection!: Connection;

  @property() public castManager!: CastManager;

  @state() private askWrite = false;

  @state() private lovelaceConfig?: LovelaceConfig | null;

  protected render(): TemplateResult {
    if (this.lovelaceConfig === undefined) {
      return html`<hass-loading-screen no-toolbar></hass-loading-screen>`;
    }

    const error =
      this.castManager.castState === "NO_DEVICES_AVAILABLE"
        ? html`
            <p>There were no suitable Chromecast devices to cast to found.</p>
          `
        : undefined;

    return html`
      <hc-layout .auth=${this.auth} .connection=${this.connection}>
        ${this.askWrite
          ? html`
              <p class="question action-item">
                Stay logged in?
                <span>
                  <mwc-button @click=${this._handleSaveTokens}>
                    YES
                  </mwc-button>
                  <mwc-button @click=${this._handleSkipSaveTokens}>
                    NO
                  </mwc-button>
                </span>
              </p>
            `
          : ""}
        ${error
          ? html` <div class="card-content">${error}</div> `
          : !this.castManager.status
          ? html`
              <p class="center-item">
                <mwc-button raised @click=${this._handleLaunch}>
                  <ha-svg-icon .path=${mdiCast}></ha-svg-icon>
                  Start Casting
                </mwc-button>
              </p>
            `
          : html`
              <div class="section-header">PICK A VIEW</div>
              <paper-listbox
                attr-for-selected="data-path"
                .selected=${this.castManager.status.lovelacePath || ""}
              >
                ${(this.lovelaceConfig
                  ? this.lovelaceConfig.views
                  : [generateDefaultViewConfig({}, {}, {}, {}, () => "")]
                ).map(
                  (view, idx) => html`
                    <paper-icon-item
                      @click=${this._handlePickView}
                      data-path=${view.path || idx}
                    >
                      ${view.icon
                        ? html`
                            <ha-icon
                              .icon=${view.icon}
                              slot="item-icon"
                            ></ha-icon>
                          `
                        : ""}
                      ${view.title || view.path}
                    </paper-icon-item>
                  `
                )}
              </paper-listbox>
            `}
        <div class="card-actions">
          ${this.castManager.status
            ? html`
                <mwc-button @click=${this._handleLaunch}>
                  <ha-svg-icon .path=${mdiCastConnected}></ha-svg-icon>
                  Manage
                </mwc-button>
              `
            : ""}
          <div class="spacer"></div>
          <mwc-button @click=${this._handleLogout}>Log out</mwc-button>
        </div>
      </hc-layout>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    const llColl = atLeastVersion(this.connection.haVersion, 0, 107)
      ? getLovelaceCollection(this.connection)
      : getLegacyLovelaceCollection(this.connection);
    // We first do a single refresh because we need to check if there is LL
    // configuration.
    llColl.refresh().then(
      () => {
        llColl.subscribe((config) => {
          this.lovelaceConfig = config;
        });
      },
      async () => {
        this.lovelaceConfig = null;
      }
    );

    this.askWrite = askWrite();

    this.castManager.addEventListener("state-changed", () => {
      this.requestUpdate();
    });
    this.castManager.addEventListener("connection-changed", () => {
      this.requestUpdate();
    });
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    toggleAttribute(
      this,
      "hide-icons",
      this.lovelaceConfig
        ? !this.lovelaceConfig.views.some((view) => view.icon)
        : true
    );
  }

  private async _handleSkipSaveTokens() {
    this.askWrite = false;
  }

  private async _handleSaveTokens() {
    enableWrite();
    this.askWrite = false;
  }

  private _handleLaunch() {
    this.castManager.requestSession();
  }

  private async _handlePickView(ev: Event) {
    const path = (ev.currentTarget as any).getAttribute("data-path");
    await ensureConnectedCastSession(this.castManager!, this.auth!);
    castSendShowLovelaceView(this.castManager, this.auth.data.hassUrl, path);
  }

  private async _handleLogout() {
    try {
      await this.auth.revoke();
      saveTokens(null);
      if (this.castManager.castSession) {
        this.castManager.castContext.endCurrentSession(true);
      }
      this.connection.close();
      location.reload();
    } catch (err: any) {
      alert("Unable to log out!");
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .center-item {
        display: flex;
        justify-content: space-around;
      }

      .action-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .question {
        position: relative;
        padding: 8px 16px;
      }

      .question:before {
        border-radius: 4px;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        pointer-events: none;
        content: "";
        background-color: var(--primary-color);
        opacity: 0.12;
        will-change: opacity;
      }

      .connection,
      .connection a {
        color: var(--secondary-text-color);
      }

      mwc-button ha-svg-icon {
        margin-right: 8px;
        height: 18px;
      }

      paper-listbox {
        padding-top: 0;
      }

      paper-listbox ha-icon {
        padding: 12px;
        color: var(--secondary-text-color);
      }

      paper-icon-item {
        cursor: pointer;
      }

      paper-icon-item[disabled] {
        cursor: initial;
      }

      :host([hide-icons]) paper-icon-item {
        --paper-item-icon-width: 0px;
      }

      .spacer {
        flex: 1;
      }

      .card-content a {
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-cast": HcCast;
  }
}
