import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { HASSDomTargetEvent } from "../../common/dom/fire_event";
import "../../components/item/ha-list-item-switch";
import type { HaListItemSwitch } from "../../components/item/ha-list-item-switch";
import type { HomeAssistant } from "../../types";

@customElement("ha-force-narrow-row")
class HaForcedNarrowRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <ha-list-item-switch
        .checked=${this.hass.dockedSidebar === "always_hidden"}
        @change=${this._checkedChanged}
      >
        <span slot="headline"
          >${this.hass.localize("ui.panel.profile.force_narrow.header")}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize(
            "ui.panel.profile.force_narrow.description"
          )}</span
        >
      </ha-list-item-switch>
    `;
  }

  private async _checkedChanged(ev: HASSDomTargetEvent<HaListItemSwitch>) {
    const newValue = ev.target.checked;
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
