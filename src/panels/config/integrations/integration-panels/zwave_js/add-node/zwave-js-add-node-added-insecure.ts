import { mdiCheckCircleOutline } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import "@shoelace-style/shoelace/dist/components/animation/animation";
import { css, html, LitElement, nothing } from "lit";
import type { HomeAssistant } from "../../../../../../types";

import "../../../../../../components/ha-svg-icon";
import "../../../../../../components/ha-alert";

@customElement("zwave-js-add-node-added-insecure")
export class ZWaveJsAddNodeFinished extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "device-name" }) public deviceName?: string;

  @property() public reason?;

  render() {
    return html`
      <sl-animation name="zoomIn" .iterations=${1} play>
        <ha-svg-icon .path=${mdiCheckCircleOutline}></ha-svg-icon>
      </sl-animation>
      <div>
        ${this.hass.localize(
          "ui.panel.config.zwave_js.add_node.added_insecure.text",
          {
            name: html`<b>${this.deviceName}</b>`,
          }
        )}
      </div>
      <ha-alert
        .title=${this.hass.localize(
          "ui.panel.config.zwave_js.add_node.added_insecure.added_insecurely"
        )}
        alert-type="warning"
      >
        ${this.hass.localize(
          "ui.panel.config.zwave_js.add_node.added_insecure.added_insecurely_text"
        )}
        ${this.reason
          ? html`
              <p>
                ${this.hass.localize(
                  `ui.panel.config.zwave_js.add_node.added_insecure.low_security_reason.${this.reason}`
                )}
              </p>
            `
          : nothing}
      </ha-alert>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    ha-svg-icon {
      --mdc-icon-size: 96px;
      color: var(--warning-color);
    }
    div,
    ha-alert {
      margin-top: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-js-add-node-added-insecure": ZWaveJsAddNodeFinished;
  }
}
