import { mdiCast, mdiCastConnected, mdiViewDashboard } from "@mdi/js";
import type { Auth, Connection } from "home-assistant-js-websocket";
import type { TemplateResult, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { CastManager } from "../../../../src/cast/cast_manager";
import {
  castSendShowLovelaceView,
  ensureConnectedCastSession,
} from "../../../../src/cast/receiver_messages";
import {
  askWrite,
  enableWrite,
  saveTokens,
} from "../../../../src/common/auth/token_storage";
import type { HASSDomCurrentTargetEvent } from "../../../../src/common/dom/fire_event";
import { atLeastVersion } from "../../../../src/common/config/version";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-icon";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/components/item/ha-list-item-option";
import type { HaListItemOption } from "../../../../src/components/item/ha-list-item-option";
import "../../../../src/components/list/ha-list-selectable";
import {
  getLegacyLovelaceCollection,
  getLovelaceCollection,
} from "../../../../src/data/lovelace";
import { isStrategyDashboard } from "../../../../src/data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../../../src/data/lovelace/config/view";
import "../../../../src/layouts/hass-loading-screen";
import "./hc-layout";

@customElement("hc-cast")
class HcCast extends LitElement {
  @property({ attribute: false }) public auth!: Auth;

  @property({ attribute: false }) public connection!: Connection;

  @property({ attribute: false }) public castManager!: CastManager;

  @state() private askWrite = false;

  @state() private lovelaceViews?: LovelaceViewConfig[] | null;

  protected render(): TemplateResult {
    if (this.lovelaceViews === undefined) {
      return html`<hass-loading-screen no-toolbar></hass-loading-screen>`;
    }

    const error =
      this.castManager.castState === "NO_DEVICES_AVAILABLE"
        ? html`
            <p>There were no suitable Chromecast devices to cast to found.</p>
          `
        : undefined;

    const views = this.lovelaceViews ?? [{ title: "Home" }];
    const hasIcons = views.some((view) => view.icon);

    return html`
      <hc-layout .auth=${this.auth} .connection=${this.connection}>
        ${
          this.askWrite
            ? html`
                <p class="question action-item">
                  Stay logged in?
                  <span>
                    <ha-button
                      appearance="plain"
                      size="small"
                      @click=${this._handleSaveTokens}
                    >
                      YES
                    </ha-button>
                    <ha-button
                      appearance="plain"
                      size="small"
                      @click=${this._handleSkipSaveTokens}
                    >
                      NO
                    </ha-button>
                  </span>
                </p>
              `
            : ""
        }
        ${
          error
            ? html` <div class="card-content">${error}</div> `
            : !this.castManager.status
              ? html`
                  <p class="center-item">
                    <ha-button @click=${this._handleLaunch}>
                      <ha-svg-icon slot="start" .path=${mdiCast}></ha-svg-icon>
                      Start Casting
                    </ha-button>
                  </p>
                `
              : html`
                  <div class="section-header" id="pick-view-header">
                    PICK A VIEW
                  </div>
                  <ha-list-selectable
                    controlled
                    aria-labelledby="pick-view-header"
                  >
                    ${views.map(
                      (view, idx) => html`
                        <ha-list-item-option
                          data-index=${idx}
                          @click=${this._handlePickView}
                          .headline=${view.title || view.path || "Unnamed view"}
                          .selected=${
                            this.castManager.status?.lovelacePath ===
                            (view.path ?? idx)
                          }
                        >
                          ${
                            !hasIcons
                              ? nothing
                              : view.icon
                                ? html`<ha-icon
                                    slot="start"
                                    .icon=${view.icon}
                                  ></ha-icon>`
                                : html`<ha-svg-icon
                                    slot="start"
                                    .path=${mdiViewDashboard}
                                  ></ha-svg-icon>`
                          }
                        </ha-list-item-option>
                      `
                    )}
                  </ha-list-selectable>
                `
        }

        <div class="card-actions">
          ${
            this.castManager.status
              ? html`
                  <ha-button appearance="plain" @click=${this._handleLaunch}>
                    <ha-svg-icon
                      slot="start"
                      .path=${mdiCastConnected}
                    ></ha-svg-icon>
                    Manage
                  </ha-button>
                `
              : ""
          }
          <div class="spacer"></div>
          <ha-button
            variant="danger"
            appearance="plain"
            @click=${this._handleLogout}
            >Log out</ha-button
          >
        </div>
      </hc-layout>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);

    const llColl = atLeastVersion(this.connection.haVersion, 0, 107)
      ? getLovelaceCollection(this.connection)
      : getLegacyLovelaceCollection(this.connection);
    // We first do a single refresh because we need to check if there is LL
    // configuration.
    llColl.refresh().then(
      () => {
        llColl.subscribe((config) => {
          if (isStrategyDashboard(config)) {
            this.lovelaceViews = null;
          } else {
            this.lovelaceViews = config.views;
          }
        });
      },
      async () => {
        this.lovelaceViews = null;
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

  // Listens to clicks instead of `ha-list-item-selected`, which does not fire
  // for the selected view, so the current view can still be cast again.
  private async _handlePickView(
    ev: HASSDomCurrentTargetEvent<HaListItemOption>
  ) {
    const index = Number(ev.currentTarget.dataset.index);
    const path = this.lovelaceViews?.[index]?.path ?? index;
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
    } catch (_err: any) {
      alert("Unable to log out!");
    }
  }

  static styles = css`
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
      border-radius: var(--ha-border-radius-sm);
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

    ha-list-item-option ha-icon,
    ha-list-item-option ha-svg-icon {
      color: var(--secondary-text-color);
    }

    .spacer {
      flex: 1;
    }

    .card-content a {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-cast": HcCast;
  }
}
