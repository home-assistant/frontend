import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import type { HASSDomTargetEvent } from "../../../../common/dom/fire_event";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { storage } from "../../../../common/decorators/storage";
import { DEBUG_SAFE_AREA_TOOL_STORAGE_KEY } from "../../../../common/util/debug-safe-area";
import "../../../../components/item/ha-list-item-switch";
import type { HaListItemSwitch } from "../../../../components/item/ha-list-item-switch";
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
      <ha-list-item-switch
        wrap-headline
        wrap-supporting-text
        .checked=${this._enabled}
        @change=${this._checkedChanged}
      >
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
      </ha-list-item-switch>
    `;
  }

  private _checkedChanged(ev: HASSDomTargetEvent<HaListItemSwitch>) {
    this._enabled = ev.target.checked;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-debug-safe-area-tool-row": HaDebugSafeAreaToolRow;
  }
}
