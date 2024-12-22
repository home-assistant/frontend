import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../../../../../../types";
import { sharedStyles } from "./matter-add-device-shared-styles";
import "../../../../../../components/ha-circular-progress";

@customElement("matter-add-device-commissioning")
class MatterAddDeviceCommissioning extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  render() {
    return html`
      <div class="content">
        <ha-circular-progress
          size="medium"
          indeterminate
        ></ha-circular-progress>
        <p>
          ${this.hass.localize(
            "ui.dialogs.matter-add-device.commissioning.note"
          )}
        </p>
      </div>
    `;
  }

  static styles = [
    sharedStyles,
    css`
      .content {
        display: flex;
        align-items: center;
        flex-direction: column;
        text-align: center;
      }
      ha-circular-progress {
        margin-bottom: 24px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-commissioning": MatterAddDeviceCommissioning;
  }
}
