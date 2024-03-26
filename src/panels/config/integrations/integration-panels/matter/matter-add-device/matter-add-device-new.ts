import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../../components/ha-circular-progress";
import {
  canCommissionMatterExternal,
  startExternalCommissioning,
} from "../../../../../../data/matter";
import { HomeAssistant } from "../../../../../../types";
import { sharedStyles } from "./matter-add-device-shared-styles";

@customElement("matter-add-device-new")
class MatterAddDeviceNew extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected firstUpdated(): void {
    if (!canCommissionMatterExternal(this.hass)) {
      return;
    }
    startExternalCommissioning(this.hass);
  }

  render() {
    if (canCommissionMatterExternal(this.hass)) {
      return html`
        <div class="content">
          <ha-circular-progress
            size="medium"
            indeterminate
          ></ha-circular-progress>
        </div>
      `;
    }

    return html`
      <div class="content">
        <p>
          ${this.hass.localize(
            "ui.panel.config.integrations.config_flow.matter_mobile_app"
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-new": MatterAddDeviceNew;
  }
}
