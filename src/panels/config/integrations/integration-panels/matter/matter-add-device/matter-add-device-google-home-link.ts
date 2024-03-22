import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../../components/ha-list-item-new";
import "../../../../../../components/ha-list-new";
import "../../../../../../components/ha-icon-next";
import { HomeAssistant } from "../../../../../../types";
import { fireEvent } from "../../../../../../common/dom/fire_event";

@customElement("matter-add-device-google-home-link")
class MatterAddDeviceAppleHomeCode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  render() {
    return html`
      <div class="content">
        <ol>
          <li>
            Find your device in Google Home and open device settings by tapping
            the gear icon.
          </li>
          <li>Tap Linked Matter apps and services.</li>
          <li>
            Tap Link apps and services and choose Home Assistant from the list.
            <br />
            <span
              class="link"
              type="button"
              tabindex="0"
              @keydown=${this._nextStep}
              @click=${this._nextStep}
            >
              I can’t find Home Assistant in the list
            </span>
          </li>
        </ol>
        <p>
          You are redirected to the Home Assistant app. Please follow the
          instructions.
        </p>
      </div>
    `;
  }

  private _nextStep() {
    fireEvent(this, "step-selected", { step: "google_home_code" });
  }

  static styles = [
    css`
      .content {
        padding: 8px 24px 0 24px;
      }
      p {
        margin: 0 0 8px 0;
      }
      .link {
        color: var(--primary-color);
        cursor: pointer;
        text-decoration: underline;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-google-home-link": MatterAddDeviceAppleHomeCode;
  }
}
