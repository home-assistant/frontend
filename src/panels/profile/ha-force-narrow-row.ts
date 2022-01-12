import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-settings-row";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import type { HomeAssistant } from "../../types";

@customElement("ha-force-narrow-row")
class HaForcedNarrowRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
