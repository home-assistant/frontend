import { mdiCheckCircleOutline } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import "@shoelace-style/shoelace/dist/components/animation/animation";
import { css, html, LitElement } from "lit";
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
      <ha-alert alert-type="warning">
        ${this.reason
          ? this.hass.localize(
              `ui.panel.config.zwave_js.add_node.added_insecure.low_security_reason.${this.reason}`
            )
          : ""}
        ${this.hass.localize(
          "ui.panel.config.zwave_js.add_node.added_insecure.added_insecurely_text",
          {
            deviceName: html`<b>${this.deviceName}</b>`,
          }
        )}
        <p>
          ${this.hass.localize(
            `ui.panel.config.zwave_js.add_node.added_insecure.try_again_text`
          )}
        </p>
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
