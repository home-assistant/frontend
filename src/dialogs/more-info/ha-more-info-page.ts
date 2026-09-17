import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { mainWindow } from "../../common/dom/get_main_window";
import {
  registerNavigationInterceptor,
  unregisterNavigationInterceptor,
} from "../../common/navigate";
import {
  decodeMoreInfoUrl,
  isMoreInfoStandalonePath,
} from "../../common/url/more-info-query-params";
import { afterNextRender } from "../../common/util/render-status";
import "../../components/ha-alert";
import type { HomeAssistant } from "../../types";
import { removeLaunchScreen } from "../../util/launch-screen";
import "./ha-more-info-dialog";
import type { MoreInfoDialog } from "./ha-more-info-dialog";
import type { MoreInfoView } from "./more-info-view";

/**
 * Frameless page showing the more-info dialog for the entity named in the
 * URL, without the sidebar or any panel around it. External apps load it in
 * a native screen; the entity and view come from the same query parameters
 * as the more-info deep link (`more-info-entity-id`, `more-info-view`).
 */
@customElement("ha-more-info-page")
export class HaMoreInfoPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entityId?: string;

  @state() private _view?: MoreInfoView;

  @query("ha-more-info-dialog") private _dialog?: MoreInfoDialog;

  public connectedCallback() {
    super.connectedCallback();
    this._readUrl();
    mainWindow.addEventListener("location-changed", this._readUrl);
    mainWindow.addEventListener("popstate", this._readUrl);
    registerNavigationInterceptor(this._relayNavigation);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    mainWindow.removeEventListener("location-changed", this._readUrl);
    mainWindow.removeEventListener("popstate", this._readUrl);
    unregisterNavigationInterceptor(this._relayNavigation);
  }

  protected render() {
    if (!this._entityId) {
      return html`
        <ha-alert alert-type="error">
          ${this.hass.localize("ui.dialogs.more_info_control.no_entity")}
        </ha-alert>
      `;
    }
    return html`
      <ha-more-info-dialog standalone .hass=${this.hass}></ha-more-info-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    // The main frontend is not rendered on this route, so the app's commands
    // (navigate to another entity, restart the connection) are answered here.
    if (this.hass.auth.external) {
      import("../../external_app/external_app_entrypoint").then((mod) =>
        mod.attachExternalToApp(this)
      );
    }
    // There is no panel to wait for, so remove the launch screen once the page
    // has painted. Native apps cover the frontend with their own splash screen
    // until frontend/loaded, so they remove it without animation.
    afterNextRender(() => {
      const external = this.hass.auth?.external;
      if (removeLaunchScreen(!!external?.config.hasSplashscreen)) {
        external?.fireMessage({ type: "frontend/loaded" });
      }
    });
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_entityId") || changedProps.has("_view")) {
      this._showEntity();
    }
  }

  /**
   * A link out of the page (device page, entity editor, related items) is for
   * the app's main frontend; this screen keeps showing its entity until the app
   * dismisses it. Without an app the page is replaced by the framed frontend.
   */
  private _relayNavigation = (path: string): boolean => {
    const external = this.hass?.auth.external;
    if (
      !external ||
      isMoreInfoStandalonePath(
        new URL(path, mainWindow.location.origin).pathname
      )
    ) {
      return false;
    }
    external.fireMessage({ type: "more_info/navigate", payload: { path } });
    return true;
  };

  private _readUrl = () => {
    const { entityId, view } = decodeMoreInfoUrl(mainWindow.location.search);
    this._entityId = entityId;
    this._view = view;
  };

  private _showEntity() {
    if (!this._entityId || !this._dialog) {
      return;
    }
    // The dialog keeps the URL in sync while it switches views or follows
    // related entities itself, so only a different entity is a new request.
    if (this._dialog.entityId === this._entityId) {
      return;
    }
    const { pathname, search, hash } = mainWindow.location;
    this._dialog.showDialog({
      entityId: this._entityId,
      view: this._view,
      returnUrl: `${pathname}${search}${hash}`,
    });
  }

  static styles = css`
    :host {
      display: block;
    }

    ha-alert {
      display: block;
      margin: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-page": HaMoreInfoPage;
  }
}
