import "@shoelace-style/shoelace/dist/components/animation/animation";
import { mdiRestart } from "@mdi/js";

import { customElement, property } from "lit/decorators";
import { css, html, LitElement } from "lit";

import "../../../../../../components/ha-spinner";
import "../../../../../../components/ha-button";
import "../../../../../../components/ha-alert";
import type { HomeAssistant } from "../../../../../../types";
import { fireEvent } from "../../../../../../common/dom/fire_event";

@customElement("zwave-js-add-node-searching-devices")
export class ZWaveJsAddNodeSearchingDevices extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, attribute: "specific-device" })
  public specificDevice = false;

  render() {
    return html`
      <div class="searching-devices">
        <div class="searching-spinner">
          <div class="spinner">
            <ha-spinner></ha-spinner>
          </div>
          <sl-animation name="pulse" easing="linear" .duration=${2000} play>
            <div class="circle"></div>
          </sl-animation>
        </div>
        ${this.specificDevice
          ? html`<ha-alert
                .title=${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.specific_device.turn_on_device"
                )}
              >
                <ha-svg-icon slot="icon" .path=${mdiRestart}></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.specific_device.turn_on_device_description"
                )}
              </ha-alert>
              <p class="note">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.specific_device.close_description"
                )}
              </p>`
          : html`
              <p>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.follow_device_instructions"
                )}
              </p>
            `}
        <ha-button @click=${this._handleButton}>
          ${this.hass.localize(
            `ui.panel.config.zwave_js.add_node.${this.specificDevice ? "specific_device.add_another_z_wave_device" : "security_options"}`
          )}
        </ha-button>
      </div>
    `;
  }

  private _handleButton() {
    if (this.specificDevice) {
      fireEvent(this, "add-another-z-wave-device");
    } else {
      fireEvent(this, "show-z-wave-security-options");
    }
  }

  static styles = css`
    :host {
      text-align: center;
      display: block;
    }
    ha-alert {
      margin-top: 32px;
      display: block;
    }
    .note {
      font-size: 12px;
      color: var(--secondary-text-color);
    }
    .searching-spinner {
      margin-left: auto;
      margin-right: auto;
      position: relative;
      width: 128px;
      height: 128px;
    }
    .searching-spinner .circle {
      border-radius: 50%;
      background-color: var(--light-primary-color);
      position: absolute;
      width: calc(100% - 32px);
      height: calc(100% - 32px);
      margin: 16px;
    }
    .searching-spinner .spinner {
      z-index: 1;
      position: absolute;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      --ha-spinner-divider-color: var(--light-primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-js-add-node-searching-devices": ZWaveJsAddNodeSearchingDevices;
  }

  interface HASSDomEvents {
    "show-z-wave-security-options": undefined;
    "add-another-z-wave-device": undefined;
  }
}
