import "@material/mwc-button/mwc-button";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { haStyleSidebarItem } from "../resources/styles";
import "./ha-svg-icon";
import "./ha-icon";
import { createKeydown, createKeyup } from "../resources/button-handlers";

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

  protected render() {
    const keydown = createKeydown((e) =>
      (e.currentTarget as HTMLElement).click()
    );
    const keyup = createKeyup((e) => (e.currentTarget as HTMLElement).click());
    return html`<a
      href="/${this.path}"
      aria-current=${this.selected ? "page" : "false"}
      aria-label=${this.name}
      class="item ${this.expanded ? "expanded" : ""}"
      @keydown=${keydown}
      @keyup=${keyup}
    >
      <div class="target"></div>
      <span class="icon">
        ${this.iconPath
          ? html`<ha-svg-icon .path=${this.iconPath}></ha-svg-icon>`
          : html`<ha-icon .icon=${this.icon}></ha-icon>`}
      </span>
      <span class="name">${this.name}</span>
    </a>`;
  }

  static styles = [haStyleSidebarItem, styles];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-panel": HaSidebarPanel;
  }
}
