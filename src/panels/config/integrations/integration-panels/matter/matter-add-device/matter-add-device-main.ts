import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../../components/ha-list-item-new";
import "../../../../../../components/ha-list-new";
import "../../../../../../components/ha-icon-next";
import { HomeAssistant } from "../../../../../../types";
import { fireEvent } from "../../../../../../common/dom/fire_event";

@customElement("matter-add-device-main")
class MatterAddDeviceMain extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  render() {
    return html`
      <div class="content">
        <p class="text">
          Is your device already added to another Matter controller?
        </p>
      </div>
      <ha-list-new>
        <ha-list-item-new
          interactive
          type="button"
          .step=${"new"}
          @click=${this._onItemClick}
          @keydown=${this._onItemClick}
        >
          <span slot="headline">It’s new</span>
          <span slot="supporting-text">
            My device is brand new or is factory reset.
          </span>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-new>
        <ha-list-item-new
          interactive
          type="button"
          .step=${"existing"}
          @click=${this._onItemClick}
          @keydown=${this._onItemClick}
        >
          <span slot="headline">It’s already in use</span>
          <span slot="supporting-text">
            My device is connected to another controller.
          </span>
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
    const step = item.step as "new" | "existing";
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-main": MatterAddDeviceMain;
  }
}
