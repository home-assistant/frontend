import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../components/ha-card";
import "../../components/ha-switch";
import {
  CoreFrontendUserData,
  getOptimisticFrontendUserDataCollection,
} from "../../data/frontend";
import { HomeAssistant } from "../../types";
import "../../components/ha-settings-row";

@customElement("ha-overflow-menu-row")
class OverflowMenuRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public coreUserData?: CoreFrontendUserData;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.overflow_menu.title")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.overflow_menu.description")}
        </span>
        <ha-switch
          .checked=${this.coreUserData && this.coreUserData.hideOverflowMenu}
          .disabled=${this.coreUserData === undefined}
          @change=${this._overflowToggled}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _overflowToggled(ev) {
    getOptimisticFrontendUserDataCollection(this.hass.connection, "core").save({
      hideOverflowMenu: ev.currentTarget.checked,
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
    "ha-overflow-menu-row": OverflowMenuRow;
  }
}
