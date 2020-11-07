import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import type { HomeAssistant } from "../../types";
import "../../components/ha-settings-row";

@customElement("ha-kiosk-mode-row")
class HaKioskModeRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.kiosk_mode.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.kiosk_mode.description")}
        </span>
        <ha-switch
          .checked=${this.hass.enableKioskMode}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: Event) {
    this.hass.enableOverflowMenu = (ev.target as HaSwitch).checked;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-kiosk-mode-row": HaKioskModeRow;
  }
}
