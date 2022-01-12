import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-settings-row";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import { forwardHaptic } from "../../data/haptics";
import type { HomeAssistant } from "../../types";

@customElement("ha-set-vibrate-row")
class HaSetVibrateRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.vibrate.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.vibrate.description")}
        </span>
        <ha-switch
          .checked=${this.hass.vibrate}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: Event) {
    const vibrate = (ev.target as HaSwitch).checked;
    if (vibrate === this.hass.vibrate) {
      return;
    }
    fireEvent(this, "hass-vibrate", {
      vibrate,
    });
    forwardHaptic("light");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-set-vibrate-row": HaSetVibrateRow;
  }
}
