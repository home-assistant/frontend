import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-settings-row";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import type { HomeAssistant } from "../../types";
import { storeState } from "../../util/ha-pref-storage";

@customElement("ha-safe-mode-row")
class HaSafeModeRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.safe_mode.title")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.safe_mode.description")}
        </span>
        <ha-switch
          .checked=${this.hass.safemode}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: Event) {
    const safemode = (ev.target as HaSwitch).checked;
    if (safemode === this.hass.safemode) {
      return;
    }
    this.hass.safemode = safemode;
    storeState(this.hass);
    location.reload();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-safe-mode-row": HaSafeModeRow;
  }
}
