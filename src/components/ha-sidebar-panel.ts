import "@material/mwc-button/mwc-button";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { haStyleSidebarItem } from "../resources/styles";
import "./ha-svg-icon";
import "./ha-icon";

const styles = css`
  :host {
    width: 100%;
  }
  .item.expanded {
    width: 100%;
  }
  .count {
    margin-left: auto;
  }
`;
@customElement("ha-sidebar-panel")
class HaSidebarPanel extends LitElement {
  @property() public path = "";

  @property() public name = "";

  @property() public icon = "";

  @property() public iconPath = "";

  @property({ type: Boolean }) public expanded = false;

  @property({ type: Boolean }) public selected = false;

  static styles = [haStyleSidebarItem, styles];

  protected render() {
    return html`<a
      href="/${this.path}"
      aria-selected=${this.selected}
      class="item ${this.expanded ? "expanded" : ""}"
    >
      <span class="icon">
        ${this.iconPath
          ? html`<ha-svg-icon
              slot="item-icon"
              .path=${this.iconPath}
            ></ha-svg-icon>`
          : html`<ha-icon slot="item-icon" .icon=${this.icon}></ha-icon>`}
      </span>
      <span class="name">${this.name}</span>
    </a>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-panel": HaSidebarPanel;
  }
}
