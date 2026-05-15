import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import "../../components/item/ha-row-item";
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

  protected render(): TemplateResult {
    return html`
      <ha-row-item>
        <span slot="headline"
          >${this.hass.localize("ui.panel.profile.suspend.header")}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize("ui.panel.profile.suspend.description")}</span
        >
        <ha-switch
          slot="end"
          .checked=${this.hass.suspendWhenHidden}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-row-item>
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
