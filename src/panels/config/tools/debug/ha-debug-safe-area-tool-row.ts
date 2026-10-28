import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { storage } from "../../../../common/decorators/storage";
import { DEBUG_SAFE_AREA_TOOL_STORAGE_KEY } from "../../../../common/util/debug-safe-area";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import "../../../../components/item/ha-list-item-base";
import type { LocalizeFunc } from "../../../../common/translations/localize";

@customElement("ha-debug-safe-area-tool-row")
class HaDebugSafeAreaToolRow extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @storage({ key: DEBUG_SAFE_AREA_TOOL_STORAGE_KEY, state: true })
  private _enabled = false;

  protected render() {
    return html`
      <ha-list-item-base>
        <span slot="headline"
          >${this._localize(
            "ui.panel.config.tools.tabs.debug.safe_area_tool.title"
          )}</span
        >
        <span slot="supporting-text"
          >${this._localize(
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
