import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import { EntityRow, CastConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";

import "../../../components/ha-icon";
import { CastManager } from "../../../cast/cast_manager";
import {
  ensureConnectedCastSession,
  castSendShowLovelaceView,
} from "../../../cast/receiver_messages";

@customElement("hui-cast-row")
class HuiCastRow extends LitElement implements EntityRow {
  public hass!: HomeAssistant;

  @property() private _config?: CastConfig;
  @property() private _castManager?: CastManager | null;

  public setConfig(config: CastConfig): void {
    if (!config || !config.view) {
      throw new Error("Invalid Configuration: 'view' required");
    }

    this._config = {
      icon: "hass:television",
      name: "Home Assistant Cast",
      ...config,
    };
  }

  protected render(): TemplateResult | void {
    if (!this._config) {
      return html``;
    }

    /*
    Always show cast button, so users can disconnect.

    TODO
    If connected: show Open button.
    */

    return html`
      <ha-icon .icon="${this._config.icon}"></ha-icon>
      <div class="flex">
        <div class="name">${this._config.name}</div>
        ${this._castManager
          ? html`
              <div class="controls">
                <google-cast-launcher></google-cast-launcher>
                <mwc-button
                  @click=${this._sendLovelace}
                  .disabled=${!this._castManager.status}
                >
                  SHOW
                </mwc-button>
              </div>
            `
          : this._castManager === null
          ? html`
              Cast unavailable
            `
          : ""}
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    import("../../../cast/cast_manager").then(({ getCastManager }) =>
      getCastManager(this.hass.auth).then(
        (mgr) => {
          this._castManager = mgr;
          mgr.addEventListener("connection-changed", () => {
            this.requestUpdate();
          });
        },
        () => {
          this._castManager = null;
        }
      )
    );
  }

  private async _sendLovelace() {
    await ensureConnectedCastSession(this._castManager!, this.hass.auth);
    castSendShowLovelaceView(this._castManager!, this._config!.view);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        align-items: center;
      }
      ha-icon {
        padding: 8px;
        color: var(--paper-item-icon-color);
      }
      .flex {
        flex: 1;
        overflow: hidden;
        margin-left: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .controls {
        margin-right: -0.57em;
        display: flex;
        align-items: center;
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
    "hui-cast-row": HuiCastRow;
  }
}
