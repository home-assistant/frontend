import "@material/mwc-button/mwc-button";
import { mdiMenu, mdiMenuOpen } from "@mdi/js";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import { computeRTL } from "../common/util/compute_rtl";
import { type ActionHandlerDetail } from "../data/lovelace/action_handler";
import { actionHandler } from "../panels/lovelace/common/directives/action-handler-directive";
import { HomeAssistant } from "../types";
import "./ha-icon-button";

const styles = css`
  .menu {
    display: flex;
    flex-shrink: 0;
    height: var(--header-height);
    box-sizing: border-box;
    align-items: center;
    white-space: nowrap;
  }
  .menu .title {
    color: var(--secondary-text-color);
    font-weight: 500;
    font-size: 14px;
    line-height: 20px;
    margin-left: 16px;
  }
  .menu ha-icon-button {
    margin: 0 auto;
    color: var(--sidebar-icon-color);
  }
  .menu.rtl ha-icon-button {
    transform: scaleX(-1);
  }
  .menu mwc-button {
    width: 100%;
  }
  .menu.expanded {
    padding: calc((var(--header-height) - 20px) / 5) 12px 0 12px;
  }
  .menu.expanded ha-icon-button {
    margin-inline-end: 0;
  }
`;
@customElement("ha-sidebar-title")
class HaSidebarTitle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public expanded = false;

  @property({ type: Boolean }) public editMode = false;

  static styles = styles;

  protected render() {
    const classes = classMap({
      menu: true,
      expanded: this.expanded,
      rtl: computeRTL(this.hass),
    });
    const saveEdits = html`<mwc-button outlined @click=${this._editModeOff}>
      ${this.hass.localize("ui.sidebar.done")}
    </mwc-button>`;
    const sidebarToggle = html`
      <ha-icon-button
        .label=${this.hass.localize("ui.sidebar.sidebar_toggle")}
        .path=${this.hass.dockedSidebar === "docked" ? mdiMenuOpen : mdiMenu}
        @action=${this._toggleSidebar}
      ></ha-icon-button>
    `;
    return html`<div
      class=${classes}
      .actionHandler=${actionHandler({
        hasHold: !this.editMode,
        disabled: this.editMode,
      })}
      @action=${this._editModeOn}
    >
      ${this.editMode ? saveEdits : ""}
      ${!this.expanded || this.editMode
        ? ""
        : html`<span class="title">Home Assistant</span>`}
      ${this.narrow || this.editMode ? "" : sidebarToggle}
    </div>`;
  }

  private _toggleSidebar(ev: CustomEvent<ActionHandlerDetail>) {
    if (ev.detail.action !== "tap") return;
    fireEvent(this, "hass-toggle-menu");
  }

  private _editModeOn(ev: CustomEvent<ActionHandlerDetail>) {
    if (ev.detail.action !== "hold") return;
    fireEvent(this, "hass-edit-sidebar", { editMode: true });
  }

  private _editModeOff() {
    fireEvent(this, "hass-edit-sidebar", { editMode: false });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-title": HaSidebarTitle;
  }
}
