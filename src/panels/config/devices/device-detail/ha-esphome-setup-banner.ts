import {
  mdiAccessPoint,
  mdiBluetooth,
  mdiCheck,
  mdiMusic,
  mdiSwapHorizontal,
} from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import {
  fireEvent,
  type HASSDomEvent,
} from "../../../../common/dom/fire_event";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import {
  ESPHOME_CAPABILITY_ACCENTS,
  getESPHomeSetupCapabilityIds,
  type ESPHomeCapabilityId,
  type ESPHomeSetupStatus,
} from "../../../../data/esphome_setup";
import type { HomeAssistant } from "../../../../types";

const CAPABILITY_ICONS: Record<ESPHomeCapabilityId, string> = {
  bluetooth: mdiBluetooth,
  audio: mdiMusic,
  connectivity: mdiAccessPoint,
  serial: mdiSwapHorizontal,
};

const CAPABILITY_TITLE_KEYS: Record<ESPHomeCapabilityId, LocalizeKeys> = {
  bluetooth: "ui.panel.config.devices.esphome.setup_capability_bluetooth_title",
  audio: "ui.panel.config.devices.esphome.setup_capability_audio_title",
  connectivity:
    "ui.panel.config.devices.esphome.setup_capability_connectivity_title",
  serial: "ui.panel.config.devices.esphome.setup_capability_serial_title",
};

@customElement("ha-esphome-setup-banner")
export class HaESPHomeSetupBanner extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public deviceName!: string;

  @property({ attribute: false }) public status: ESPHomeSetupStatus = {};

  @property({ type: Boolean }) public started = false;

  protected render() {
    const ids = getESPHomeSetupCapabilityIds(this.status);
    return html`
      <ha-card outlined>
        <div class="content">
          <div class="text">
            <h2>
              ${
                this.started
                  ? this.hass.localize(
                      "ui.panel.config.devices.esphome.setup_continue_title",
                      { name: this.deviceName }
                    )
                  : this.hass.localize(
                      "ui.panel.config.devices.esphome.setup_title"
                    )
              }
            </h2>
            <p>
              ${this.hass.localize(
                "ui.panel.config.devices.esphome.setup_intro",
                { count: ids.length }
              )}
            </p>
            <div class="actions">
              <ha-button @click=${this._setup}>
                ${this.hass.localize(
                  "ui.panel.config.devices.esphome.setup_action"
                )}
              </ha-button>
              <ha-button appearance="plain" @click=${this._later}>
                ${this.hass.localize(
                  "ui.panel.config.devices.esphome.setup_later"
                )}
              </ha-button>
            </div>
          </div>
          ${
            ids.length
              ? html`
                  <div class="pips">
                    ${ids.map((id) => this._renderPip(id))}
                  </div>
                `
              : ""
          }
        </div>
      </ha-card>
    `;
  }

  private _renderPip(id: ESPHomeCapabilityId) {
    const completed = this.status[id] === "completed";
    return html`
      <div class="pip">
        <span
          class="pip-chip"
          style="--capability-accent: ${ESPHOME_CAPABILITY_ACCENTS[id]}"
        >
          <ha-svg-icon .path=${CAPABILITY_ICONS[id]}></ha-svg-icon>
          ${
            completed
              ? html`
                  <span class="pip-check" aria-hidden="true">
                    <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
                  </span>
                `
              : ""
          }
        </span>
        <span class="pip-label">
          ${this.hass.localize(CAPABILITY_TITLE_KEYS[id])}
        </span>
      </div>
    `;
  }

  private _setup() {
    fireEvent(this, "esphome-setup");
  }

  private _later() {
    fireEvent(this, "esphome-setup-later");
  }

  static styles = css`
    ha-card {
      display: block;
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-5);
      padding: var(--ha-space-5);
    }
    .text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--ha-space-2);
      min-width: 0;
    }
    h2 {
      margin: 0;
      font-size: var(--ha-font-size-2xl);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
    }
    p {
      margin: 0;
      max-width: 48ch;
      color: var(--secondary-text-color);
      line-height: var(--ha-line-height-normal);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ha-space-1);
      margin-block-start: var(--ha-space-2);
    }
    .pips {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--ha-space-3) var(--ha-space-6);
      align-content: center;
    }
    .pip {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
      min-width: 0;
    }
    .pip-chip {
      position: relative;
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--ha-border-radius-circle);
      background: color-mix(in srgb, var(--capability-accent) 12%, transparent);
      color: var(--capability-accent);
    }
    .pip-chip ha-svg-icon {
      --mdc-icon-size: 18px;
    }
    .pip-check {
      position: absolute;
      inset-inline-end: -2px;
      bottom: -2px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: var(--ha-border-radius-circle);
      background: var(--success-color);
      color: var(--ha-color-on-success-loud);
      border: 2px solid var(--card-background-color);
      box-sizing: border-box;
    }
    .pip-check ha-svg-icon {
      --mdc-icon-size: 10px;
    }
    .pip-label {
      min-width: 0;
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-condensed);
    }
    @media (min-width: 768px) {
      .content {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: var(--ha-space-8);
      }
      .text {
        flex: 1.05 1 16rem;
      }
      .pips {
        flex: 1 1 12rem;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-esphome-setup-banner": HaESPHomeSetupBanner;
  }

  interface HASSDomEvents {
    "esphome-setup": undefined;
    "esphome-setup-later": undefined;
  }

  interface HTMLElementEventMap {
    "esphome-setup": HASSDomEvent<HASSDomEvents["esphome-setup"]>;
    "esphome-setup-later": HASSDomEvent<HASSDomEvents["esphome-setup-later"]>;
  }
}
