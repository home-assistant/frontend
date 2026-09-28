import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../../../types";

import "../../../../../../components/ha-alert";
import "../../../../../../components/ha-icon-next";
import "../../../../../../components/item/ha-list-item-button";
import "../../../../../../components/list/ha-list-base";

@customElement("zwave-js-add-node-select-method")
export class ZWaveJsAddNodeSelectMethod extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, attribute: "hide-qr-webcam" })
  public hideQrWebcam = false;

  render() {
    return html`
      ${
        !this.hideQrWebcam && !window.isSecureContext
          ? html`<ha-alert alert-type="warning">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.add_node.select_method.webcam_unsupported"
              )}</ha-alert
            >`
          : nothing
      }
      <ha-list-base>
        ${
          !this.hideQrWebcam
            ? html`<ha-list-item-button
                @click=${this._selectMethod}
                .value=${"qr_code_webcam"}
                .disabled=${!window.isSecureContext}
              >
                <div slot="headline">
                  ${this.hass.localize(
                    `ui.panel.config.zwave_js.add_node.select_method.qr_code_webcam`
                  )}
                </div>
                <div slot="supporting-text">
                  ${this.hass.localize(
                    `ui.panel.config.zwave_js.add_node.select_method.qr_code_webcam_description`
                  )}
                </div>
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-list-item-button>`
            : nothing
        }
        <ha-list-item-button
          @click=${this._selectMethod}
          .value=${"qr_code_manual"}
        >
          <div slot="headline">
            ${this.hass.localize(
              `ui.panel.config.zwave_js.add_node.select_method.qr_code_manual`
            )}
          </div>
          <div slot="supporting-text">
            ${this.hass.localize(
              `ui.panel.config.zwave_js.add_node.select_method.qr_code_manual_description`
            )}
          </div>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-button>
        <ha-list-item-button
          @click=${this._selectMethod}
          .value=${"search_device"}
        >
          <div slot="headline">
            ${this.hass.localize(
              `ui.panel.config.zwave_js.add_node.select_method.search_device`
            )}
          </div>
          <div slot="supporting-text">
            ${this.hass.localize(
              `ui.panel.config.zwave_js.add_node.select_method.search_device_description`
            )}
          </div>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-button>
      </ha-list-base>
    `;
  }

  private _selectMethod(event: any) {
    const method = event.currentTarget.value;
    if (method !== "qr_code_webcam" || window.isSecureContext) {
      fireEvent(this, "z-wave-method-selected", { method });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-js-add-node-select-method": ZWaveJsAddNodeSelectMethod;
  }
  interface HASSDomEvents {
    "z-wave-method-selected": {
      method: "qr_code_webcam" | "qr_code_manual" | "search_device";
    };
  }
}
