import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-md-list-item";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import type { HomeAssistant } from "../../types";

@customElement("ha-force-narrow-row")
class HaForcedNarrowRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <ha-md-list-item>
        <span slot="headline"
          >${this.hass.localize("ui.panel.profile.force_narrow.header")}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize(
            "ui.panel.profile.force_narrow.description"
          )}</span
        >
        <ha-switch
          slot="end"
          .checked=${this.hass.dockedSidebar === "always_hidden"}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-md-list-item>
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
