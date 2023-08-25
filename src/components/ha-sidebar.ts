import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant, Route } from "../types";
import "./ha-sidebar-panel-notifications";
import "./ha-sidebar-panel-user";
import "./ha-sidebar-panels";
import "./ha-sidebar-title";
import "./ha-sidebar-tooltip";

const styles = css`
  :host {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .items {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    padding-bottom: 12px;
    overflow: hidden;
  }
  hr {
    margin-inline: 12px;
    height: 1px;
    border: none;
    background-color: var(--divider-color);
  }
`;
@customElement("ha-sidebar")
class HaSidebar extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property() public route!: Route;

  @property({ type: Boolean }) public alwaysExpand = false;

  @property({ type: Boolean }) public editMode = false;

  static styles = [haStyleScrollbar, styles];

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    const currentPanel = this.route.path?.startsWith("/hassio/")
      ? "config"
      : this.hass.panelUrl;

    return html`
      <ha-sidebar-title
        .hass=${this.hass}
        .narrow=${this.narrow}
        .expanded=${this.alwaysExpand}
        .editMode=${this.editMode}
      ></ha-sidebar-title>
      <div class="items" @mouseleave=${this._mouseLeave} tabindex="-1">
        <ha-sidebar-panels
          .hass=${this.hass}
          .expanded=${this.alwaysExpand}
          .currentPanel=${currentPanel}
          .editMode=${this.editMode}
          @panel-hover=${this._panelHover}
          @panel-leave=${this._mouseLeave}
          class="ha-scrollbar"
          role="listbox"
        ></ha-sidebar-panels>
        <hr />
        <ha-sidebar-panel-notifications
          .hass=${this.hass}
          .expanded=${this.alwaysExpand}
          @mouseenter=${this._mouseOverItem}
          @mouseleave=${this._mouseLeave}
        ></ha-sidebar-panel-notifications>
        <ha-sidebar-panel-user
          .hass=${this.hass}
          .expanded=${this.alwaysExpand}
          .selected=${currentPanel === "profile"}
          @mouseenter=${this._mouseOverItem}
          @mouseleave=${this._mouseLeave}
        ></ha-sidebar-panel-user>
      </div>
      <ha-sidebar-tooltip></ha-sidebar-tooltip>
    `;
  }

  private _panelHover(ev: CustomEvent) {
    this._mouseOverItem({ target: ev.detail });
  }

  private _mouseOverItem(ev: { target: HTMLElement }) {
    const tooltipRoot =
      this.shadowRoot?.querySelector("ha-sidebar-tooltip")?.shadowRoot;
    const tooltip = tooltipRoot?.firstElementChild as HTMLElement;
    if (!tooltip) return;
    if (this.alwaysExpand) {
      tooltip.style.display = "none";
      return;
    }
    const target = ev.target;
    const targetPos = target.getBoundingClientRect();
    const label = target.shadowRoot?.querySelector(".name")?.innerHTML;
    if (!label) {
      tooltip.style.display = "none";
      return;
    }
    tooltip.innerHTML = label;
    tooltip.style.display = "block";
    tooltip.style.left = this.offsetLeft + this.clientWidth + 4 + "px";
    tooltip.style.top = targetPos.top + targetPos.height / 2 + "px";
  }

  private _mouseLeave() {
    const tooltipRoot =
      this.shadowRoot?.querySelector("ha-sidebar-tooltip")?.shadowRoot;
    const tooltip = tooltipRoot?.firstElementChild as HTMLElement;
    if (!tooltip) return;
    tooltip.style.display = "none";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar": HaSidebar;
  }
}
