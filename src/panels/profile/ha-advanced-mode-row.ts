import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-alert";
import "../../components/ha-card";
import "../../components/ha-settings-row";
import "../../components/ha-switch";
import type { CoreFrontendUserData } from "../../data/frontend";
import { saveFrontendUserData } from "../../data/frontend";
import type { HomeAssistant } from "../../types";

@customElement("ha-advanced-mode-row")
class AdvancedModeRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public coreUserData?: CoreFrontendUserData;

  @state() private _error?: string;

  protected render(): TemplateResult {
    return html`
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : nothing}
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.advanced_mode.title")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.advanced_mode.description")}
          <a
            href="https://www.home-assistant.io/blog/2019/07/17/release-96/#advanced-mode"
            target="_blank"
            rel="noreferrer"
            >${this.hass.localize("ui.panel.profile.advanced_mode.link_promo")}
          </a>
        </span>
        <ha-switch
          .checked=${this.coreUserData && this.coreUserData.showAdvanced}
          .disabled=${this.coreUserData === undefined}
          @change=${this._advancedToggled}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _advancedToggled(ev) {
    try {
      saveFrontendUserData(this.hass.connection, "core", {
        ...this.coreUserData,
        showAdvanced: ev.currentTarget.checked,
      });
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  static styles = css`
    a {
      color: var(--primary-color);
    }
    ha-alert {
      margin: 0 16px;
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-advanced-mode-row": AdvancedModeRow;
  }
}
