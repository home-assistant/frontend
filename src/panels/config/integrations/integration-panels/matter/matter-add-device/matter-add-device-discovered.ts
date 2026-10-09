import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import "../../../../../../components/input/ha-input";
import type { HomeAssistant } from "../../../../../../types";
import { sharedStyles } from "./matter-add-device-shared-styles";

@customElement("matter-add-device-discovered")
class MatterAddDeviceDiscovered extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _code = "";

  render() {
    return html`
      <div class="content">
        <p>
          ${this.hass.localize(
            "ui.dialogs.matter-add-device.discovered.code_instructions"
          )}
        </p>
        <ha-input
          label=${this.hass.localize(
            "ui.dialogs.matter-add-device.discovered.setup_code"
          )}
          .value=${this._code}
          @input=${this._onCodeChanged}
        ></ha-input>
      </div>
    `;
  }

  private _onCodeChanged(ev: InputEvent) {
    const value = (ev.target as HTMLInputElement).value;
    this._code = value;
    fireEvent(this, "pairing-code-changed", { code: value });
  }

  static styles = [sharedStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-discovered": MatterAddDeviceDiscovered;
  }
}
