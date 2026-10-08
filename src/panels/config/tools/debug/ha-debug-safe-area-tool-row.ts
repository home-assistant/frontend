import type { ContextType } from "@lit/context";
import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { storage } from "../../../../common/decorators/storage";
import { DEBUG_SAFE_AREA_TOOL_STORAGE_KEY } from "../../../../common/util/debug-safe-area";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import "../../../../components/item/ha-list-item-base";
import { internationalizationContext } from "../../../../data/context";

@customElement("ha-debug-safe-area-tool-row")
class HaDebugSafeAreaToolRow extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  @storage({ key: DEBUG_SAFE_AREA_TOOL_STORAGE_KEY, state: true })
  private _enabled = false;

  protected render() {
    if (!this._i18n) {
      return nothing;
    }
    const { localize } = this._i18n;
    return html`
      <ha-list-item-base>
        <span slot="headline"
          >${localize(
            "ui.panel.config.tools.tabs.debug.safe_area_tool.title"
          )}</span
        >
        <span slot="supporting-text"
          >${localize(
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
