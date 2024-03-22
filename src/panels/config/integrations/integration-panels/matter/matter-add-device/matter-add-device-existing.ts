import { mdiHomeAutomation } from "@mdi/js";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import "../../../../../../components/ha-icon-next";
import "../../../../../../components/ha-list-item-new";
import "../../../../../../components/ha-list-new";
import { HomeAssistant } from "../../../../../../types";
import { MatterAddDeviceStep } from "../dialog-matter-add-device";

@customElement("matter-add-device-existing")
class MatterAddDeviceExisting extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  render() {
    return html`
      <div class="content">
        <p class="text">Which controller is it connected to?</p>
      </div>

      <ha-list-new>
        <ha-list-item-new
          interactive
          type="button"
          .step=${"google_home_link"}
          @click=${this._onItemClick}
          @keydown=${this._onItemClick}
        >
          <img
            src="/static/images/logo_google_home.png"
            alt=""
            class="logo"
            slot="start"
          />
          <span slot="headline">Google Home</span>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-new>
        <ha-list-item-new
          interactive
          type="button"
          .step=${"apple_home_code"}
          @click=${this._onItemClick}
          @keydown=${this._onItemClick}
        >
          <img
            src="/static/images/logo_apple_home.png"
            alt=""
            class="logo"
            slot="start"
          />
          <span slot="headline">Apple Home</span>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-new>
        <ha-list-item-new
          interactive
          type="button"
          .step=${"others_code"}
          @click=${this._onItemClick}
          @keydown=${this._onItemClick}
        >
          <div class="logo" slot="start">
            <ha-svg-icon path=${mdiHomeAutomation}></ha-svg-icon>
          </div>
          <span slot="headline">Others controllers</span>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-new>
      </ha-list-new>
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
    css`
      .content {
        padding: 8px 24px 0 24px;
      }
      p {
        margin: 0 0 8px 0;
      }
      ha-list-new {
        --md-list-item-leading-space: 24px;
        --md-list-item-trailing-space: 24px;
      }
      .logo {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        border: 1px solid var(--divider-color);
        padding: 6px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
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
