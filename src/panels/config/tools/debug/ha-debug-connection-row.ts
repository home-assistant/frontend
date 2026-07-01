import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/item/ha-list-item-base";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import type { HomeAssistant } from "../../../../types";
import { storeState } from "../../../../util/ha-pref-storage";
import { setDebugConnection } from "../../../../util/websocket";

@customElement("ha-debug-connection-row")
class HaDebugConnectionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <ha-list-item-base>
        <span slot="headline"
          >${this.hass.localize(
            "ui.panel.config.developer-tools.tabs.debug.debug_connection.title"
          )}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize(
            "ui.panel.config.developer-tools.tabs.debug.debug_connection.description"
          )}</span
        >
        <ha-switch
          slot="end"
          .checked=${this.hass.debugConnection}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-list-item-base>
    `;
  }

  private async _checkedChanged(ev: Event) {
    const debugConnection = (ev.target as HaSwitch).checked;
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
