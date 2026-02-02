import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { storage } from "../../../../common/decorators/storage";
import { setViewTransitionDisabled } from "../../../../common/util/view-transition";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-debug-disable-view-transition-row")
class HaDebugDisableViewTransitionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @storage({ key: "disableViewTransition", state: true, subscribe: false })
  private _disabled = false;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize(
            "ui.panel.config.developer-tools.tabs.debug.disable_view_transition.title"
          )}
        </span>
        <span slot="description">
          ${this.hass.localize(
            "ui.panel.config.developer-tools.tabs.debug.disable_view_transition.description"
          )}
        </span>
        <ha-switch
          .checked=${this._disabled}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private _checkedChanged(ev: Event) {
    this._disabled = (ev.target as HaSwitch).checked;
    setViewTransitionDisabled(this._disabled);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-debug-disable-view-transition-row": HaDebugDisableViewTransitionRow;
  }
}
