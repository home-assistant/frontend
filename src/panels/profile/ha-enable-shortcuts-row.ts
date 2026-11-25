import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { HASSDomTargetEvent } from "../../common/dom/fire_event";
import "../../components/item/ha-list-item-switch";
import type { HaListItemSwitch } from "../../components/item/ha-list-item-switch";
import type { HomeAssistant } from "../../types";

@customElement("ha-enable-shortcuts-row")
class HaEnableShortcutsRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <ha-list-item-switch
        .checked=${this.hass.enableShortcuts}
        @change=${this._checkedChanged}
      >
        <span slot="headline"
          >${this.hass.localize("ui.panel.profile.enable_shortcuts.header")}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize(
            "ui.panel.profile.enable_shortcuts.description"
          )}</span
        >
      </ha-list-item-switch>
    `;
  }

  private async _checkedChanged(ev: HASSDomTargetEvent<HaListItemSwitch>) {
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
