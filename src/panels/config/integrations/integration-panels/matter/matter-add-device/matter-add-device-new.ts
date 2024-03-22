import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../../../../../../types";

@customElement("matter-add-device-new")
class MatterAddDeviceNew extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  render() {
    return html`
      <div class="content">
        <p class="text">
          ${this.hass.localize(
            "ui.panel.config.integrations.config_flow.matter_mobile_app"
          )}
        </p>
      </div>
    `;
  }

  static styles = [
    css`
      .content {
        padding: 8px 24px 0 24px;
      }
      p {
        margin: 0 0 8px 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-new": MatterAddDeviceNew;
  }
}
