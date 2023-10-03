import "@material/mwc-button/mwc-button";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { haStyleSidebarItem } from "../resources/styles";
import "./ha-svg-icon";
import "./ha-icon";
import { keydown, keyup } from "../resources/button-handlers";

const styles = css`
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
      aria-current=${this.selected ? "page" : "false"}
      aria-label=${this.name}
      class="item ${this.expanded ? "expanded" : ""}"
      @keydown=${keydown((e) => (e.currentTarget as HTMLElement).click())}
      @keyup=${keyup((e) => (e.currentTarget as HTMLElement).click())}
    >
      <div class="target"></div>
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
