import { mdiHomeAutomation } from "@mdi/js";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import "../../../../../../components/ha-icon-next";
import "../../../../../../components/ha-md-list";
import "../../../../../../components/ha-md-list-item";
import type { HomeAssistant } from "../../../../../../types";
import type { MatterAddDeviceStep } from "../dialog-matter-add-device";
import { sharedStyles } from "./matter-add-device-shared-styles";

@customElement("matter-add-device-existing")
class MatterAddDeviceExisting extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  render() {
    return html`
      <div class="content">
        <p>
          ${this.hass.localize(
            `ui.dialogs.matter-add-device.existing.question`
          )}
        </p>
      </div>

      <ha-md-list>
        <ha-md-list-item
          interactive
          type="button"
          .step=${"google_home"}
          @click=${this._onItemClick}
          @keydown=${this._onItemClick}
        >
          <img
            src="/static/images/logo_google_home.png"
            alt=""
            class="logo"
            slot="start"
          />
          <span slot="headline">
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.existing.answer_google_home`
            )}
          </span>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-md-list-item>
        <ha-md-list-item
          interactive
          type="button"
          .step=${"apple_home"}
          @click=${this._onItemClick}
          @keydown=${this._onItemClick}
        >
          <img
            src="/static/images/logo_apple_home.png"
            alt=""
            class="logo"
            slot="start"
          />
          <span slot="headline">
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.existing.answer_apple_home`
            )}
          </span>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-md-list-item>
        <ha-md-list-item
          interactive
          type="button"
          .step=${"generic"}
          @click=${this._onItemClick}
          @keydown=${this._onItemClick}
        >
          <div class="logo" slot="start">
            <ha-svg-icon path=${mdiHomeAutomation}></ha-svg-icon>
          </div>
          <span slot="headline">
            ${this.hass.localize(
              `ui.dialogs.matter-add-device.existing.answer_generic`
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
    const step = item.step as MatterAddDeviceStep;
    fireEvent(this, "step-selected", { step });
  }

  static styles = [
    sharedStyles,
    css`
      .logo {
        width: 48px;
        height: 48px;
        border-radius: var(--ha-border-radius-lg);
        border: 1px solid var(--divider-color);
        padding: 10px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        object-fit: contain;
      }
      .logo ha-svg-icon {
        --mdc-icon-size: 36px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-existing": MatterAddDeviceExisting;
  }
}
