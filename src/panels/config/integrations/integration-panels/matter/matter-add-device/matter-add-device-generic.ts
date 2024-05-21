import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import "../../../../../../components/ha-icon-next";
import "../../../../../../components/ha-list-item-new";
import "../../../../../../components/ha-list-new";
import { HomeAssistant } from "../../../../../../types";
import { sharedStyles } from "./matter-add-device-shared-styles";

@customElement("matter-add-device-generic")
class MatterAddDeviceGeneric extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _code: string = "";

  render() {
    return html`
      <div class="content">
        <p>
          ${this.hass.localize(
            "ui.dialogs.matter-add-device.generic.code_instructions"
          )}
        </p>
        <ha-textfield
          label=${this.hass.localize(
            "ui.dialogs.matter-add-device.generic.setup_code"
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
    "matter-add-device-generic": MatterAddDeviceGeneric;
  }
}
