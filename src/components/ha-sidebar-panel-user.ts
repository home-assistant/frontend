import "@material/mwc-button/mwc-button";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { haStyleSidebarItem } from "../resources/styles";
import { HomeAssistant } from "../types";
import "./user/ha-user-badge";
import { keydown, keyup } from "../resources/button-handlers";

const styles = css`
  .icon {
    height: 24px;
  }
  .user-icon {
    display: inline-flex;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) scale(0.8);
  }
`;
@customElement("ha-sidebar-panel-user")
class HaSidebarPanelUser extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public expanded = false;

  @property({ type: Boolean }) public selected = false;

  static styles = [haStyleSidebarItem, styles];

  protected render() {
    return html`<a
      href="/profile"
      aria-current=${this.selected ? "page" : "false"}
      class="item ${this.expanded ? "expanded" : ""}"
      @keydown=${keydown((e) => (e.currentTarget as HTMLElement).click())}
      @keyup=${keyup((e) => (e.currentTarget as HTMLElement).click())}
    >
      <div class="target"></div>
      <span class="icon">
        <span class="user-icon">
          <ha-user-badge
            slot="item-icon"
            .user=${this.hass.user}
            .hass=${this.hass}
          ></ha-user-badge>
        </span>
      </span>
      <span class="name">${this.hass.user ? this.hass.user.name : ""}</span>
    </a>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-panel-user": HaSidebarPanelUser;
  }
}
