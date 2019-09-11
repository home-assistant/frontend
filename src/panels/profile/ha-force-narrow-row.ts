import {
  LitElement,
  TemplateResult,
  html,
  property,
  customElement,
} from "lit-element";
import "@material/mwc-switch";

import "./ha-settings-row";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { PolymerChangedEvent } from "../../polymer-types";

@customElement("ha-force-narrow-row")
class HaPushNotificationsRow extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;

  protected render(): TemplateResult | void {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.force_narrow.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.force_narrow.description")}
        </span>
        <mwc-switch
          .checked=${this.hass.dockedSidebar === "always_hidden"}
          @checked-changed=${this._checkedChanged}
        ></mwc-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: PolymerChangedEvent<boolean>) {
    const newValue = ev.detail.value;
    if (newValue === (this.hass.dockedSidebar === "always_hidden")) {
      return;
    }
    fireEvent(this, "hass-dock-sidebar", {
      dock: newValue ? "always_hidden" : "auto",
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-force-narrow-row": HaPushNotificationsRow;
  }
}
