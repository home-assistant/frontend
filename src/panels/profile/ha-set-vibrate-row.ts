import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-md-list-item";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import { forwardHaptic } from "../../data/haptics";
import type { HomeAssistant } from "../../types";

@customElement("ha-set-vibrate-row")
class HaSetVibrateRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <ha-md-list-item>
        <span slot="headline"
          >${this.hass.localize("ui.panel.profile.vibrate.header")}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize("ui.panel.profile.vibrate.description")}</span
        >
        <ha-switch
          slot="end"
          .checked=${this.hass.vibrate}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-md-list-item>
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
    forwardHaptic(this, "light");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-set-vibrate-row": HaSetVibrateRow;
  }
}
