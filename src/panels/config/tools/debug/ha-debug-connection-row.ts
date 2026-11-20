import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { HASSDomTargetEvent } from "../../../../common/dom/fire_event";
import "../../../../components/item/ha-list-item-switch";
import type { HaListItemSwitch } from "../../../../components/item/ha-list-item-switch";
import type { HomeAssistant } from "../../../../types";
import { storeState } from "../../../../util/ha-pref-storage";
import { setDebugConnection } from "../../../../util/websocket";

@customElement("ha-debug-connection-row")
class HaDebugConnectionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <ha-list-item-switch
        wrap-headline
        wrap-supporting-text
        .checked=${this.hass.debugConnection}
        @change=${this._checkedChanged}
      >
        <span slot="headline"
          >${this.hass.localize(
            "ui.panel.config.tools.tabs.debug.debug_connection.title"
          )}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize(
            "ui.panel.config.tools.tabs.debug.debug_connection.description"
          )}</span
        >
      </ha-list-item-switch>
    `;
  }

  private async _checkedChanged(ev: HASSDomTargetEvent<HaListItemSwitch>) {
    const debugConnection = ev.target.checked;
    if (debugConnection === this.hass.debugConnection) {
      return;
    }
    this.hass.debugConnection = debugConnection;
    setDebugConnection(debugConnection);
    storeState(this.hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-debug-connection-row": HaDebugConnectionRow;
  }
}
