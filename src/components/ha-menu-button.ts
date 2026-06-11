import { consume, type ContextType } from "@lit/context";
import { mdiMenu } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import {
  connectionContext,
  narrowViewportContext,
  uiContext,
} from "../data/context";
import { subscribeNotifications } from "../data/persistent_notification";
import "./ha-icon-button";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";

@customElement("ha-menu-button")
class HaMenuButton extends LitElement {
  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ContextType<typeof connectionContext>;

  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: narrowViewportContext, subscribe: true })
  private _narrow = false;

  @state()
  @consume({ context: uiContext, subscribe: true })
  private _ui?: ContextType<typeof uiContext>;

  @state() private _hasNotifications = false;

  @state() private _show = false;

  private _alwaysVisible = false;

  private _attachNotifOnConnect = false;

  private _unsubNotifications?: UnsubscribeFunc;

  public connectedCallback() {
    super.connectedCallback();
    if (this._attachNotifOnConnect && this._connection) {
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

  protected render() {
    if (!this._show || !this._ui) {
      return nothing;
    }
    const hasNotifications =
      this._hasNotifications &&
      (this._narrow || this._ui.dockedSidebar === "always_hidden");
    return html`
      <ha-icon-button
        .label=${this._localize("ui.sidebar.sidebar_toggle")}
        .path=${mdiMenu}
        @click=${this._toggleMenu}
      ></ha-icon-button>
      ${hasNotifications ? html`<div class="dot"></div>` : ""}
    `;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (
      !changedProps.has("_narrow") &&
      !changedProps.has("_ui") &&
      !changedProps.has("_connection")
    ) {
      return;
    }

    if (changedProps.has("_connection") && this._unsubNotifications) {
      this._unsubNotifications();
      this._unsubNotifications = undefined;
    }

    const showButton =
      this._ui?.kioskMode === false &&
      (this._narrow || this._ui.dockedSidebar === "always_hidden");

    this._show = showButton || this._alwaysVisible;

    if (!showButton) {
      if (this._unsubNotifications) {
        this._unsubNotifications();
        this._unsubNotifications = undefined;
      }
      return;
    }

    if (!this._unsubNotifications && this._connection) {
      this._attachNotifOnConnect = false;
      this._subscribeNotifications();
    }
  }

  private _subscribeNotifications() {
    if (this._unsubNotifications) {
      throw new Error("Already subscribed");
    }
    this._unsubNotifications = subscribeNotifications(
      this._connection!.connection,
      (notifications) => {
        this._hasNotifications = notifications.length > 0;
      }
    );
  }

  private _toggleMenu(): void {
    fireEvent(this, "hass-toggle-menu");
  }

  static styles = css`
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
      inset-inline-end: 7px;
      inset-inline-start: initial;
      border-radius: var(--ha-border-radius-circle);
      border: 2px solid var(--app-header-background-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-menu-button": HaMenuButton;
  }
}
