import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-settings-row";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import type { HomeAssistant } from "../../types";

@customElement("ha-enable-shortcuts-row")
class HaEnableShortcutsRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.enable_shortcuts.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.enable_shortcuts.description")}
        </span>
        <ha-switch
          .checked=${this.hass.enableShortcuts}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: Event) {
    const enabled = (ev.target as HaSwitch).checked;
    if (enabled === this.hass.enableShortcuts) {
      return;
    }

    fireEvent(this, "hass-enable-shortcuts", enabled);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-enable-shortcuts-row": HaEnableShortcutsRow;
  }
}
