import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../../common/decorators/storage";
import "../../components/ha-list-item";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import type { HomeAssistant } from "../../types";

type WinterModePreference = "auto" | "always" | "never";

@customElement("ha-set-winter-mode-row")
class HaSetWinterModeRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @storage({ key: "winter-mode-preference", state: true, subscribe: true })
  @state()
  private _preference: WinterModePreference = "auto";

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.winter_mode.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.winter_mode.description")}
        </span>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.profile.winter_mode.dropdown_label"
          )}
          .value=${this._preference}
          @selected=${this._handleSelectionChanged}
          naturalMenuWidth
        >
          <ha-list-item value="auto">
            ${this.hass.localize("ui.panel.profile.winter_mode.options.auto")}
          </ha-list-item>
          <ha-list-item value="always">
            ${this.hass.localize("ui.panel.profile.winter_mode.options.always")}
          </ha-list-item>
          <ha-list-item value="never">
            ${this.hass.localize("ui.panel.profile.winter_mode.options.never")}
          </ha-list-item>
        </ha-select>
      </ha-settings-row>
    `;
  }

  private _handleSelectionChanged(ev: CustomEvent) {
    const preference = (ev.target as any).value as WinterModePreference;
    if (preference === this._preference) {
      return;
    }
    this._preference = preference;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-set-winter-mode-row": HaSetWinterModeRow;
  }
}
