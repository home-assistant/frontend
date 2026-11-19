import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { HASSDomTargetEvent } from "../../common/dom/fire_event";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import "../../components/item/ha-row-item";
import type { HomeAssistant } from "../../types";

@customElement("ha-enable-shortcuts-row")
class HaEnableShortcutsRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    const label = this.hass.localize(
      "ui.panel.profile.enable_shortcuts.header"
    );
    return html`
      <ha-row-item>
        <span slot="headline">${label}</span>
        <span slot="supporting-text"
          >${this.hass.localize(
            "ui.panel.profile.enable_shortcuts.description"
          )}</span
        >
        <ha-switch
          slot="end"
          .accessibleLabel=${label}
          .checked=${this.hass.enableShortcuts}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-row-item>
    `;
  }

  private async _checkedChanged(ev: HASSDomTargetEvent<HaSwitch>) {
    const enabled = ev.target.checked;
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
