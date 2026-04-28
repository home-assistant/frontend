import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import "../../../../../../components/ha-icon-next";
import "../../../../../../components/ha-md-list-item";
import "../../../../../../components/ha-md-list";
import "../../../../../../components/input/ha-input";
import type { HomeAssistant } from "../../../../../../types";
import { sharedStyles } from "./matter-add-device-shared-styles";

@customElement("matter-add-device-generic")
class MatterAddDeviceGeneric extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _code = "";

  render() {
    return html`
      <div class="content">
        <p>
          ${this.hass.localize(
            "ui.dialogs.matter-add-device.generic.code_instructions"
          )}
        </p>
        <ha-input
          label=${this.hass.localize(
            "ui.dialogs.matter-add-device.generic.setup_code"
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
    "matter-add-device-generic": MatterAddDeviceGeneric;
  }
}
