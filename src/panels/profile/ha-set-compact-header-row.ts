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

@customElement("ha-set-compact-header-row")
class HaSetCompactHeaderRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.compact_header.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.compact_header.description")}
        </span>
        <ha-switch
          .checked=${this.hass.compactHeader}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: Event) {
    const compact = (ev.target as HaSwitch).checked;
    if (compact === this.hass.compactHeader) {
      return;
    }
    fireEvent(this, "hass-compact-header", {
      compactHeader: compact,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-set-compact-header-row": HaSetCompactHeaderRow;
  }
}
