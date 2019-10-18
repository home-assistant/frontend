import "@polymer/paper-icon-button/paper-icon-button";
import {
  property,
  TemplateResult,
  LitElement,
  html,
  customElement,
  CSSResult,
  css,
} from "lit-element";

import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant } from "../types";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { subscribeNotifications } from "../data/persistent_notification";
import { computeDomain } from "../common/entity/compute_domain";

@customElement("ha-menu-button")
class HaMenuButton extends LitElement {
  @property({ type: Boolean }) public hassio = false;
  @property() public narrow!: boolean;
  @property() public hass!: HomeAssistant;
  @property() private _hasNotifications = false;
  private _alwaysVisible = false;
  private _attachNotifOnConnect = false;
  private _unsubNotifications?: UnsubscribeFunc;

  public connectedCallback() {
    super.connectedCallback();
    if (this._attachNotifOnConnect) {
      this._attachNotifOnConnect = false;
      this._subscribeNotifications();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubNotifications) {
      this._attachNotifOnConnect = true;
      this._unsubNotifications();
      this._unsubNotifications = undefined;
    }
  }

  protected render(): TemplateResult | void {
    const hasNotifications =
      (this.narrow || this.hass.dockedSidebar === "always_hidden") &&
      (this._hasNotifications ||
        Object.keys(this.hass.states).some(
          (entityId) => computeDomain(entityId) === "configurator"
        ));
    if (this.narrow || this.hass.dockedSidebar !== "always_hidden") {
      return;
    }
    return html`
      <paper-icon-button
        aria-label="Sidebar Toggle"
        .icon=${this.hassio ? "hassio:menu" : "hass:menu"}
        @click=${this._toggleMenu}
      ></paper-icon-button>
      ${hasNotifications
        ? html`
            <div class="dot"></div>
          `
        : ""}
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (!this.hassio) {
      return;
    }
    // This component is used on Hass.io too, but Hass.io might run the UI
    // on older frontends too, that don't have an always visible menu button
    // in the sidebar.
    this._alwaysVisible =
      (Number((window.parent as any).frontendVersion) || 0) < 20190710;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (!changedProps.has("narrow") && !changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldNarrow =
      changedProps.get("narrow") ||
      (oldHass && oldHass.dockedSidebar === "always_hidden");
    const newNarrow =
      this.narrow || this.hass.dockedSidebar === "always_hidden";

    if (oldNarrow === newNarrow) {
      return;
    }

    this.style.visibility =
      newNarrow || this._alwaysVisible ? "initial" : "hidden";

    if (!newNarrow) {
      this._hasNotifications = false;
      if (this._unsubNotifications) {
        this._unsubNotifications();
        this._unsubNotifications = undefined;
      }
      return;
    }

    this._subscribeNotifications();
  }

  private _subscribeNotifications() {
    this._unsubNotifications = subscribeNotifications(
      this.hass.connection,
      (notifications) => {
        this._hasNotifications = notifications.length > 0;
      }
    );
  }

  private _toggleMenu(): void {
    fireEvent(this, "hass-toggle-menu");
  }

  static get styles(): CSSResult {
    return css`
      :host {
        position: relative;
      }
      .dot {
        pointer-events: none;
        position: absolute;
        background-color: var(--accent-color);
        width: 12px;
        height: 12px;
        top: 5px;
        right: 2px;
        border-radius: 50%;
        border: 2px solid var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-menu-button": HaMenuButton;
  }
}
