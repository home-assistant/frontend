import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import type { HomeAssistant, Route } from "../types";
import "./ha-sidebar-title";
import "./ha-sidebar-panels";
import "./ha-sidebar-notifications";
import "./ha-sidebar-user";
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
    padding: 0 12px 12px;
    overflow: hidden;
  }
  hr {
    width: 100%;
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

  static styles = styles;

  private currentPanel = "";

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-sidebar-title
        .hass=${this.hass}
        .narrow=${this.narrow}
        .expanded=${this.alwaysExpand}
        .editMode=${this.editMode}
      ></ha-sidebar-title>
      <div class="items" @mouseleave=${this._mouseLeave}>
        <ha-sidebar-panels
          .hass=${this.hass}
          .expanded=${this.alwaysExpand}
          .currentPanel=${this.currentPanel}
          @panel-hover=${this._panelHover}
          @panel-leave=${this._mouseLeave}
        ></ha-sidebar-panels>
        <hr />
        <ha-sidebar-notifications
          .hass=${this.hass}
          .expanded=${this.alwaysExpand}
          @mouseenter=${this._mouseOverItem}
          @mouseleave=${this._mouseLeave}
        ></ha-sidebar-notifications>
        <ha-sidebar-user
          .hass=${this.hass}
          .expanded=${this.alwaysExpand}
          .selected=${this.currentPanel === "profile"}
          @mouseenter=${this._mouseOverItem}
          @mouseleave=${this._mouseLeave}
        ></ha-sidebar-user>
      </div>
      <ha-sidebar-tooltip></ha-sidebar-tooltip>
    `;
  }

  protected updated() {
    this.currentPanel = this.route.path?.startsWith("/hassio/")
      ? "config"
      : this.hass.panelUrl;
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
