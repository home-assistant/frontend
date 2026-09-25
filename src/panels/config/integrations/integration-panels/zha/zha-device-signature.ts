import type { CSSResultGroup, PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-code-editor";
import type { ZHADevice } from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { zhaDevicePageCardStyles } from "./device-page/zha-device-page-card-styles";

@customElement("zha-device-zigbee-info")
class ZHADeviceZigbeeInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device?: ZHADevice;

  @state() private _signature: any;

  protected updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("device") && this.hass && this.device) {
      this._signature = JSON.stringify(
        {
          ...this.device.signature,
          manufacturer: this.device.manufacturer,
          model: this.device.model,
          class: this.device.quirk_class,
        },
        null,
        2
      );
    }
    super.updated(changedProperties);
  }

  protected render() {
    if (!this._signature) {
      return nothing;
    }

    return html`
      <ha-card class="device-page-card">
        <div class="card-header">
          <div class="card-title">
            ${this.hass.localize(
              "ui.panel.config.zha.device_page.tabs.signature"
            )}
          </div>
          <div class="card-description">
            ${this.hass.localize(
              "ui.panel.config.zha.device_page.tab_descriptions.signature"
            )}
          </div>
        </div>
        <ha-code-editor
          mode="yaml"
          read-only
          .value=${this._signature}
          dir="ltr"
        >
        </ha-code-editor>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [haStyle, zhaDevicePageCardStyles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-zigbee-info": ZHADeviceZigbeeInfo;
  }
}
