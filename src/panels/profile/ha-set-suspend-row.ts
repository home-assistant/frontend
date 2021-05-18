import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent, HASSDomEvent } from "../../common/dom/fire_event";
import "../../components/ha-settings-row";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import type { HomeAssistant } from "../../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-suspend-when-hidden": { suspend: HomeAssistant["suspendWhenHidden"] };
  }
  // for add event listener
  interface HTMLElementEventMap {
    "hass-suspend-when-hidden": HASSDomEvent<{
      suspend: HomeAssistant["suspendWhenHidden"];
    }>;
  }
}

@customElement("ha-set-suspend-row")
class HaSetSuspendRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.suspend.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.suspend.description")}
        </span>
        <ha-switch
          .checked=${this.hass.suspendWhenHidden}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: Event) {
    const suspend = (ev.target as HaSwitch).checked;
    if (suspend === this.hass.suspendWhenHidden) {
      return;
    }
    fireEvent(this, "hass-suspend-when-hidden", {
      suspend,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-set-suspend-row": HaSetSuspendRow;
  }
}
