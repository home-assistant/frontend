import {
  LitElement,
  TemplateResult,
  html,
  property,
  customElement,
} from "lit-element";

import "./ha-settings-row";
import "../../components/ha-switch";

import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
// tslint:disable-next-line: no-duplicate-imports
import { HaSwitch } from "../../components/ha-switch";

@customElement("ha-force-narrow-row")
class HaForcedNarrowRow extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.force_narrow.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.force_narrow.description")}
        </span>
        <ha-switch
          .checked=${this.hass.dockedSidebar === "always_hidden"}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: Event) {
    const newValue = (ev.target as HaSwitch).checked;
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
    "ha-force-narrow-row": HaForcedNarrowRow;
  }
}
