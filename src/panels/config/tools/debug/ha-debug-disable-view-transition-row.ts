import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { HASSDomTargetEvent } from "../../../../common/dom/fire_event";
import { storage } from "../../../../common/decorators/storage";
import { setViewTransitionDisabled } from "../../../../common/util/view-transition";
import "../../../../components/item/ha-list-item-switch";
import type { HaListItemSwitch } from "../../../../components/item/ha-list-item-switch";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-debug-disable-view-transition-row")
class HaDebugDisableViewTransitionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @storage({ key: "disableViewTransition", state: true, subscribe: false })
  private _disabled = false;

  protected render(): TemplateResult {
    return html`
      <ha-list-item-switch
        wrap-headline
        wrap-supporting-text
        .checked=${this._disabled}
        @change=${this._checkedChanged}
      >
        <span slot="headline"
          >${this.hass.localize(
            "ui.panel.config.tools.tabs.debug.disable_view_transition.title"
          )}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize(
            "ui.panel.config.tools.tabs.debug.disable_view_transition.description"
          )}</span
        >
      </ha-list-item-switch>
    `;
  }

  private _checkedChanged(ev: HASSDomTargetEvent<HaListItemSwitch>) {
    this._disabled = ev.target.checked;
    setViewTransitionDisabled(this._disabled);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-debug-disable-view-transition-row": HaDebugDisableViewTransitionRow;
  }
}
