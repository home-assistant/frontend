import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import "../../../../../../components/ha-icon-next";
import "../../../../../../components/item/ha-list-item-button";
import "../../../../../../components/list/ha-list-base";
import type { HomeAssistant } from "../../../../../../types";
import { sharedStyles } from "./matter-add-device-shared-styles";

@customElement("matter-add-device-main")
class MatterAddDeviceMain extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  render() {
    return html`
      <div class="content">
        <p class="text">
          ${this.hass.localize(`ui.dialogs.matter-add-device.main.question`)}
        </p>
      </div>
      <ha-list-base>
        <ha-list-item-button .step=${"new"} @click=${this._onItemClick}>
          <span slot="headline">
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.main.answer_new`
            )}
          </span>
          <span slot="supporting-text">
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.main.answer_new_description`
            )}
          </span>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-button>
        <ha-list-item-button .step=${"existing"} @click=${this._onItemClick}>
          <span slot="headline">
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.main.answer_existing`
            )}
          </span>
          <span slot="supporting-text">
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.main.answer_existing_description`
            )}
          </span>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-button>
      </ha-list-base>
    `;
  }

  private _onItemClick(ev) {
    const item = ev.currentTarget as any;
    const step = item.step as "new" | "existing";
    fireEvent(this, "step-selected", { step });
  }

  static styles = [sharedStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-main": MatterAddDeviceMain;
  }
}
