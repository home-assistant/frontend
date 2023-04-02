import "@material/mwc-button/mwc-button";
import { mdiCellphoneCog } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { haStyleSidebarItem } from "../resources/styles";
import "./ha-icon";
import "./ha-svg-icon";
import { HomeAssistant } from "../types";

const styles = css`
  :host {
    width: 100%;
  }
  .item {
    width: 100%;
  }
`;
@customElement("ha-sidebar-panel-ext-config")
class HaSidebarPanelExtConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public name = "";

  @property({ type: Boolean }) public expanded = false;

  static styles = [haStyleSidebarItem, styles];

  protected render() {
    return html`<button
      class="item ${this.expanded ? "expanded" : ""}"
      @click=${this._showConfig}
    >
      <span class="icon">
        <ha-svg-icon .path=${mdiCellphoneCog}></ha-svg-icon>
      </span>
      <span class="name">${this.name}</span>
    </button>`;
  }

  private _showConfig() {
    this.hass.auth.external!.fireMessage({
      type: "config_screen/show",
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-panel-ext-config": HaSidebarPanelExtConfig;
  }
}
