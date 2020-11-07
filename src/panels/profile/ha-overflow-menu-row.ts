import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import type { HomeAssistant } from "../../types";
import "../../components/ha-settings-row";

@customElement("ha-overflow-menu-row")
class HaOverflowMenuRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.overflow_menu.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.overflow_menu.description")}
        </span>
        <ha-switch
          .checked=${this.hass.enableOverflowMenu}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: Event) {
    const enabled = (ev.target as HaSwitch).checked;
    if (enabled === this.hass.enableOverflowMenu) {
      return;
    }

    fireEvent(this, "hass-enable-overflow-menu", enabled);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-overflow-menu-row": HaOverflowMenuRow;
  }
}
