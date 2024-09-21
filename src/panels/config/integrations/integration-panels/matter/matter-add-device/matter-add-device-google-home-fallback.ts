import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import "../../../../../../components/ha-icon-next";
import "../../../../../../components/ha-md-list-item";
import "../../../../../../components/ha-md-list";
import { HomeAssistant } from "../../../../../../types";
import { sharedStyles } from "./matter-add-device-shared-styles";

@customElement("matter-add-device-google-home-fallback")
class MatterAddDeviceGoogleHomeFallback extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _code: string = "";

  render() {
    return html`
      <div class="content">
        <ol>
          <li>
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.google_home_fallback.step_1`
            )}
          </li>
          <li>
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.google_home_fallback.step_2`,
              {
                linked_matter_apps_services: html`<b
                  >${this.hass.localize(
                    `ui.dialogs.matter-add-device.google_home_fallback.linked_matter_apps_services`
                  )}</b
                >`,
              }
            )}
          </li>
          <li>
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.google_home_fallback.step_3`,
              {
                link_apps_services: html`<b
                  >${this.hass.localize(
                    `ui.dialogs.matter-add-device.google_home_fallback.link_apps_services`
                  )}</b
                >`,
                use_pairing_code: html`<b
                  >${this.hass.localize(
                    `ui.dialogs.matter-add-device.google_home_fallback.use_pairing_code`
                  )}</b
                >`,
              }
            )}
          </li>
        </ol>
        <br />
        <p>
          ${this.hass.localize(
            `ui.dialogs.matter-add-device.google_home_fallback.code_instructions`
          )}
        </p>
        <ha-textfield
          label=${this.hass.localize(
            `ui.dialogs.matter-add-device.google_home_fallback.pairing_code`
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
    "matter-add-device-google-home-fallback": MatterAddDeviceGoogleHomeFallback;
  }
}
