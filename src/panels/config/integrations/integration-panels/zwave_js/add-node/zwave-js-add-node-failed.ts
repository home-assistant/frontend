import { customElement, property } from "lit/decorators";
import { css, html, LitElement, nothing } from "lit";
import type { HomeAssistant } from "../../../../../../types";

import "../../../../../../components/ha-alert";

@customElement("zwave-js-add-node-failed")
export class ZWaveJsAddNodeFailed extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public error?: string;

  render() {
    return html`
      <ha-alert
        alert-type="error"
        .title=${this.hass.localize(
          "ui.panel.config.zwave_js.add_node.inclusion_failed"
        )}
      >
        ${this.error ||
        this.hass.localize("ui.panel.config.zwave_js.add_node.check_logs")}
      </ha-alert>
      ${this.error
        ? html` <div class="note">
            ${this.hass.localize(
              "ui.panel.config.zwave_js.add_node.check_logs"
            )}
          </div>`
        : nothing}
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: 16px;
    }
    div.note {
      text-align: center;
      margin-top: 16px;
      font-size: 12px;
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-js-add-node-failed": ZWaveJsAddNodeFailed;
  }
}
