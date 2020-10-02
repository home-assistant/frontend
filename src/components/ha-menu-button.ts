import "@material/mwc-icon-button";
import { mdiMenu } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import { subscribeNotifications } from "../data/persistent_notification";
import { HomeAssistant } from "../types";
import "./ha-svg-icon";

@customElement("ha-menu-button")
class HaMenuButton extends LitElement {
  @property({ type: Boolean }) public hassio = false;

  @property() public narrow!: boolean;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _hasNotifications = false;

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

  protected render(): TemplateResult {
    const hasNotifications =
      (this.narrow || this.hass.dockedSidebar === "always_hidden") &&
      (this._hasNotifications ||
        Object.keys(this.hass.states).some(
          (entityId) => computeDomain(entityId) === "configurator"
        ));
    return html`
      <mwc-icon-button
        aria-label=${this.hass.localize("ui.sidebar.sidebar_toggle")}
        @click=${this._toggleMenu}
      >
        <ha-svg-icon .path=${mdiMenu}></ha-svg-icon>
      </mwc-icon-button>
      ${hasNotifications ? html` <div class="dot"></div> ` : ""}
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
        top: 9px;
        right: 7px;
        border-radius: 50%;
        border: 2px solid var(--app-header-background-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-menu-button": HaMenuButton;
  }
}
