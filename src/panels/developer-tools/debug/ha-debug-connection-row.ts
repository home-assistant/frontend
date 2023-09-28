import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import type { HomeAssistant } from "../../../types";
import { storeState } from "../../../util/ha-pref-storage";

@customElement("ha-debug-connection-row")
class HaDebugConnectionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.debug.debug_connection.title"
          )}
        </span>
        <span slot="description">
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.debug.debug_connection.description"
          )}
        </span>
        <ha-switch
          .checked=${this.hass.debugConnection}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: Event) {
    const debugConnection = (ev.target as HaSwitch).checked;
    if (debugConnection === this.hass.debugConnection) {
      return;
    }
    this.hass.debugConnection = debugConnection;
    storeState(this.hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-debug-connection-row": HaDebugConnectionRow;
  }
}
