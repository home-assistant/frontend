import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../../../../../../types";
import { sharedStyles } from "./matter-add-device-shared-styles";

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

  static styles = [sharedStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-new": MatterAddDeviceNew;
  }
}
