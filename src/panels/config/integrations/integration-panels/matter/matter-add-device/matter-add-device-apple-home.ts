import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import "../../../../../../components/ha-icon-next";
import "../../../../../../components/ha-list-item-new";
import "../../../../../../components/ha-list-new";
import { HomeAssistant } from "../../../../../../types";
import { sharedStyles } from "./matter-add-device-shared-styles";

@customElement("matter-add-device-apple-home")
class MatterAddDeviceAppleHome extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _code: string = "";

  render() {
    return html`
      <div class="content">
        <ol>
          <li>
            ${this.hass.localize(
              "ui.dialogs.matter-add-device.apple_home.step_1",
              {
                accessory_settings: html`<b
                  >${this.hass.localize(
                    "ui.dialogs.matter-add-device.apple_home.accessory_settings"
                  )}</b
                >`,
              }
            )}
          </li>
          <li>
            ${this.hass.localize(
              "ui.dialogs.matter-add-device.apple_home.step_2",
              {
                turn_on_pairing_mode: html`<b
                  >${this.hass.localize(
                    "ui.dialogs.matter-add-device.apple_home.turn_on_pairing_mode"
                  )}</b
                >`,
              }
            )}
          </li>
          <li>
            ${this.hass.localize(
              "ui.dialogs.matter-add-device.apple_home.step_3"
            )}
          </li>
        </ol>
        <br />
        <p>
          ${this.hass.localize(
            "ui.dialogs.matter-add-device.apple_home.code_instructions"
          )}
        </p>
        <ha-textfield
          label=${this.hass.localize(
            "ui.dialogs.matter-add-device.apple_home.setup_code"
          )}
          .value=${this._code}
          @input=${this._onCodeChanged}
        ></ha-textfield>
      </div>
    `;
  }

  private _onCodeChanged(ev: any) {
    const value = ev.currentTarget.value;
    this._code = value;
    fireEvent(this, "pairing-code-changed", { code: value });
  }

  static styles = [sharedStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-apple-home": MatterAddDeviceAppleHome;
  }
}
