import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { storage } from "../../../../common/decorators/storage";
import { DEBUG_SAFE_AREA_TOOL_STORAGE_KEY } from "../../../../common/util/debug-safe-area";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import "../../../../components/item/ha-list-item-base";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-debug-safe-area-tool-row")
class HaDebugSafeAreaToolRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @storage({ key: DEBUG_SAFE_AREA_TOOL_STORAGE_KEY, state: true })
  private _enabled = false;

  protected render(): TemplateResult {
    return html`
      <ha-list-item-base>
        <span slot="headline"
          >${this.hass.localize(
            "ui.panel.config.tools.tabs.debug.safe_area_tool.title"
          )}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize(
            "ui.panel.config.tools.tabs.debug.safe_area_tool.description"
          )}</span
        >
        <ha-switch
          slot="end"
          .checked=${this._enabled}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-list-item-base>
    `;
  }

  private _checkedChanged(ev: Event) {
    this._enabled = (ev.target as HaSwitch).checked;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-debug-safe-area-tool-row": HaDebugSafeAreaToolRow;
  }
}
