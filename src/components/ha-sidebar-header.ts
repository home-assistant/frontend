import "./ha-sidebar-panel-list";
import "./ha-clickable-list-item";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-list/mwc-list";
import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button";
import { mdiMenu, mdiMenuOpen } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-icon";
import "./ha-menu-button";
import "./ha-svg-icon";
import "./user/ha-user-badge";

@customElement("ha-sidebar-header")
class HaSidebarHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @property() public text: TemplateResult | string = "";

  @property() public toggleButtonCallback?: (ev: CustomEvent) => void;

  // property used only in css
  // @ts-ignore
  @property({ type: Boolean, reflect: true }) public rtl = false;

  protected render() {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${!this.narrow
        ? html`
            <mwc-icon-button
              .label=${this.hass.localize("ui.sidebar.sidebar_toggle")}
              @action=${this.toggleButtonCallback}
            >
              <ha-svg-icon
                .path=${this.hass.dockedSidebar === "docked"
                  ? mdiMenuOpen
                  : mdiMenu}
              ></ha-svg-icon>
            </mwc-icon-button>
          `
        : ""}
      <div class="title">
        ${this.text}
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [haStyleScrollbar, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-header": HaSidebarHeader;
  }
}
