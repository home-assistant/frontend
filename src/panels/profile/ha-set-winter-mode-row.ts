import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../../common/decorators/storage";
import "../../components/ha-settings-row";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import type { HomeAssistant } from "../../types";

@customElement("ha-set-winter-mode-row")
class HaSetWinterModeRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @storage({ key: "snowflakes-enabled", state: true, subscribe: true })
  @state()
  private _winterMode = true;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.winter_mode.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.winter_mode.description")}
        </span>
        <ha-switch
          .checked=${this._winterMode}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private _checkedChanged(ev: Event) {
    const winterMode = (ev.target as HaSwitch).checked;
    if (winterMode === this._winterMode) {
      return;
    }
    this._winterMode = winterMode;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-set-winter-mode-row": HaSetWinterModeRow;
  }
}
