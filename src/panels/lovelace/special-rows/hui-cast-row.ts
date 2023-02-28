import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { CastManager } from "../../../cast/cast_manager";
import {
  castSendShowLovelaceView,
  ensureConnectedCastSession,
} from "../../../cast/receiver_messages";
import "../../../components/ha-icon";
import { HomeAssistant } from "../../../types";
import { CastConfig, LovelaceRow } from "../entity-rows/types";

@customElement("hui-cast-row")
class HuiCastRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: CastConfig;

  @state() private _castManager?: CastManager | null;

  @state() private _noHTTPS = false;

  public setConfig(config: CastConfig): void {
    this._config = {
      icon: "mdi:television",
      name: "Home Assistant Cast",
      view: 0,
      ...config,
    };
  }

  protected shouldUpdate(changedProperties: PropertyValues) {
    return !(changedProperties.size === 1 && changedProperties.has("hass"));
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const active =
      this._castManager &&
      this._castManager.status &&
      this._config.view === this._castManager.status.lovelacePath &&
      this._config.dashboard === this._castManager.status.urlPath;

    return html`
      <ha-icon .icon=${this._config.icon}></ha-icon>
      <div class="flex">
        <div class="name">${this._config.name}</div>
        ${this._noHTTPS
          ? html` Cast requires HTTPS `
          : this._castManager === undefined
          ? nothing
          : this._castManager === null
          ? html` Cast API unavailable `
          : this._castManager.castState === "NO_DEVICES_AVAILABLE"
          ? html` No devices found `
          : html`
              <div class="controls">
                <google-cast-launcher></google-cast-launcher>
                <mwc-button
                  @click=${this._sendLovelace}
                  class=${classMap({ inactive: !active })}
                  .unelevated=${active}
                  .disabled=${!this._castManager.status}
                >
                  SHOW
                </mwc-button>
              </div>
            `}
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (location.protocol === "http:" && location.hostname !== "localhost") {
      this._noHTTPS = true;
    }
    import("../../../cast/cast_manager").then(({ getCastManager }) =>
      getCastManager(this.hass.auth).then(
        (mgr) => {
          this._castManager = mgr;
          mgr.addEventListener("connection-changed", () => {
            this.requestUpdate();
          });
          mgr.addEventListener("state-changed", () => {
            this.requestUpdate();
          });
        },
        () => {
          this._castManager = null;
        }
      )
    );
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (this._config && this._config.hide_if_unavailable) {
      this.style.display =
        !this._castManager ||
        this._castManager.castState === "NO_DEVICES_AVAILABLE"
          ? "none"
          : "";
    }
  }

  private async _sendLovelace() {
    await ensureConnectedCastSession(this._castManager!, this.hass.auth);
    castSendShowLovelaceView(
      this._castManager!,
      this.hass.auth.data.hassUrl,
      this._config!.view!,
      this._config!.dashboard
    );
  }

  static get styles(): CSSResultGroup {
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
        display: flex;
        align-items: center;
      }
      google-cast-launcher {
        margin-right: 0.57em;
        cursor: pointer;
        display: inline-block;
        height: 24px;
        width: 24px;
      }
      .inactive {
        padding: 0 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cast-row": HuiCastRow;
  }
}
