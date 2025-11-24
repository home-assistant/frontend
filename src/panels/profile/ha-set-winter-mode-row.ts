import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import "../../components/ha-settings-row";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import type { HomeAssistant } from "../../types";
import {
  saveFrontendSystemData,
  subscribeFrontendSystemData,
} from "../../data/frontend";

@customElement("ha-set-winter-mode-row")
class HaSetWinterModeRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _winterMode?: boolean;

  private _unsub?: Promise<UnsubscribeFunc>;

  connectedCallback() {
    super.connectedCallback();
    this._unsub = subscribeFrontendSystemData(
      this.hass.connection,
      "winter_mode",
      ({ value }) => {
        this._winterMode = value?.enabled ?? false;
      }
    );
  }

  async disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) {
      (await this._unsub)();
    }
  }

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
          .checked=${this._winterMode ?? false}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: Event) {
    const winterMode = (ev.target as HaSwitch).checked;
    if (winterMode === this._winterMode) {
      return;
    }
    await saveFrontendSystemData(this.hass.connection, "winter_mode", {
      enabled: winterMode,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-set-winter-mode-row": HaSetWinterModeRow;
  }
}
