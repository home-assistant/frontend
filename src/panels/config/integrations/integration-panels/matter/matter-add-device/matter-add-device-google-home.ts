import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import "../../../../../../components/ha-icon-next";
import "../../../../../../components/ha-md-list-item";
import "../../../../../../components/ha-md-list";
import { HomeAssistant } from "../../../../../../types";
import { sharedStyles } from "./matter-add-device-shared-styles";

@customElement("matter-add-device-google-home")
class MatterAddDeviceGoogleHome extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  render() {
    return html`
      <div class="content">
        <ol>
          <li>
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.google_home.step_1`
            )}
          </li>
          <li>
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.google_home.step_2`,
              {
                linked_matter_apps_services: html`<b
                  >${this.hass.localize(
                    `ui.dialogs.matter-add-device.google_home.linked_matter_apps_services`
                  )}</b
                >`,
              }
            )}
          </li>
          <li>
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.google_home.step_3`,
              {
                link_apps_services: html`<b
                  >${this.hass.localize(
                    `ui.dialogs.matter-add-device.google_home.link_apps_services`
                  )}</b
                >`,
                home_assistant: html`<b>Home Assistant</b>`,
              }
            )}
            <br />
            <span
              class="link"
              type="button"
              tabindex="0"
              @keydown=${this._nextStep}
              @click=${this._nextStep}
            >
              ${this.hass.localize(
                `ui.dialogs.matter-add-device.google_home.no_home_assistant`
              )}
            </span>
          </li>
        </ol>
        <br />
        <p>
          ${this.hass.localize(
            `ui.dialogs.matter-add-device.google_home.redirect`
          )}
        </p>
      </div>
    `;
  }

  private _nextStep() {
    fireEvent(this, "step-selected", { step: "google_home_fallback" });
  }

  static styles = [sharedStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-google-home": MatterAddDeviceGoogleHome;
  }
}
