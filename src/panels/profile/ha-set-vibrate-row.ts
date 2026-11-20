import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { HASSDomTargetEvent } from "../../common/dom/fire_event";
import "../../components/item/ha-list-item-switch";
import type { HaListItemSwitch } from "../../components/item/ha-list-item-switch";
import { forwardHaptic } from "../../data/haptics";
import type { HomeAssistant } from "../../types";

@customElement("ha-set-vibrate-row")
class HaSetVibrateRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <ha-list-item-switch
        .checked=${this.hass.vibrate}
        @change=${this._checkedChanged}
      >
        <span slot="headline"
          >${this.hass.localize("ui.panel.profile.vibrate.header")}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize("ui.panel.profile.vibrate.description")}</span
        >
      </ha-list-item-switch>
    `;
  }

  private async _checkedChanged(ev: HASSDomTargetEvent<HaListItemSwitch>) {
    const vibrate = ev.target.checked;
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
