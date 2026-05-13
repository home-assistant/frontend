import { mdiDotsVertical } from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { navigate } from "../../../common/navigate";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import type { HomeAssistant } from "../../../types";
import { developerToolsMenuPages } from "./developer-tools-tabs";

@customElement("developer-tools-page-menu")
class DeveloperToolsPageMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render() {
    return html`
      <ha-dropdown @wa-select=${this._handleMenuAction}>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        ${developerToolsMenuPages.map(
          (page) => html`
            <ha-dropdown-item value=${page.path}>
              ${this.hass.localize(page.translationKey)}
            </ha-dropdown-item>
          `
        )}
      </ha-dropdown>
    `;
  }

  private _handleMenuAction(ev: HaDropdownSelectEvent) {
    navigate(ev.detail.item.value);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-page-menu": DeveloperToolsPageMenu;
  }
}
