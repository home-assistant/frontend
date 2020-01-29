import {
  LitElement,
  property,
  TemplateResult,
  html,
  customElement,
  CSSResult,
  css,
} from "lit-element";

import "../../components/ha-card";

import { HomeAssistant } from "../../types";
import {
  CoreFrontendUserData,
  getOptimisticFrontendUserDataCollection,
} from "../../data/frontend";

@customElement("ha-advanced-mode-row")
class AdvancedModeRow extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public coreUserData?: CoreFrontendUserData;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.advanced_mode.title")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.advanced_mode.description")}
          <a
            href="https://www.home-assistant.io/blog/2019/07/17/release-96/#advanced-mode"
            target="_blank"
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
    getOptimisticFrontendUserDataCollection(this.hass.connection, "core").save({
      showAdvanced: ev.currentTarget.checked,
    });
  }

  static get styles(): CSSResult {
    return css`
      a {
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-advanced-mode-row": AdvancedModeRow;
  }
}
