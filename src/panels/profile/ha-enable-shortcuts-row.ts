import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-md-list-item";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import type { HomeAssistant } from "../../types";

@customElement("ha-enable-shortcuts-row")
class HaEnableShortcutsRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <ha-md-list-item>
        <span slot="headline"
          >${this.hass.localize(
            "ui.panel.profile.enable_shortcuts.header"
          )}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize(
            "ui.panel.profile.enable_shortcuts.description"
          )}</span
        >
        <ha-switch
          slot="end"
          .checked=${this.hass.enableShortcuts}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-md-list-item>
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
