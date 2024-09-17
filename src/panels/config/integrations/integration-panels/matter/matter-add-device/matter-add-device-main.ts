import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import "../../../../../../components/ha-icon-next";
import "../../../../../../components/ha-md-list-item";
import "../../../../../../components/ha-md-list";
import { HomeAssistant } from "../../../../../../types";
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
      <ha-md-list>
        <ha-md-list-item
          interactive
          type="button"
          .step=${"new"}
          @click=${this._onItemClick}
          @keydown=${this._onItemClick}
        >
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
        </ha-md-list-item>
        <ha-md-list-item
          interactive
          type="button"
          .step=${"existing"}
          @click=${this._onItemClick}
          @keydown=${this._onItemClick}
        >
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
        </ha-md-list-item>
      </ha-md-list>
    `;
  }

  private _onItemClick(ev) {
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
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
