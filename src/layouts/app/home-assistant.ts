import "@polymer/app-route/app-location";
import { html, LitElement, PropertyValues, css, property } from "lit-element";

import "../home-assistant-main";
import "../ha-init-page";
import "../../resources/ha-style";
import { registerServiceWorker } from "../../util/register-service-worker";
import { DEFAULT_PANEL } from "../../common/const";

import HassBaseMixin from "./hass-base-mixin";
import AuthMixin from "./auth-mixin";
import TranslationsMixin from "./translations-mixin";
import ThemesMixin from "./themes-mixin";
import MoreInfoMixin from "./more-info-mixin";
import SidebarMixin from "./sidebar-mixin";
import { dialogManagerMixin } from "./dialog-manager-mixin";
import ConnectionMixin from "./connection-mixin";
import NotificationMixin from "./notification-mixin";
import DisconnectToastMixin from "./disconnect-toast-mixin";
import { Route, HomeAssistant } from "../../types";
import { navigate } from "../../common/navigate";

(LitElement.prototype as any).html = html;
(LitElement.prototype as any).css = css;

const ext = <T>(baseClass: T, mixins): T =>
  mixins.reduceRight((base, mixin) => mixin(base), baseClass);

export class HomeAssistantAppEl extends ext(HassBaseMixin(LitElement), [
  AuthMixin,
  ThemesMixin,
  TranslationsMixin,
  MoreInfoMixin,
  SidebarMixin,
  DisconnectToastMixin,
  ConnectionMixin,
  NotificationMixin,
  dialogManagerMixin,
]) {
  @property() private _route?: Route;
  @property() private _error?: boolean;
  @property() private _panelUrl?: string;

  protected render() {
    const hass = this.hass;

    return html`
      <app-location
        @route-changed=${this._routeChanged}
        ?use-hash-as-path=${__DEMO__}
      ></app-location>
      ${this._panelUrl === undefined || this._route === undefined
        ? ""
        : hass && hass.states && hass.config && hass.panels && hass.services
        ? html`
            <home-assistant-main
              .hass=${this.hass}
              .route=${this._route}
            ></home-assistant-main>
          `
        : html`
            <ha-init-page .error=${this._error}></ha-init-page>
          `}
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    setTimeout(registerServiceWorker, 1000);
    /* polyfill for paper-dropdown */
    import(/* webpackChunkName: "polyfill-web-animations-next" */ "web-animations-js/web-animations-next-lite.min");
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("_panelUrl")) {
      this.panelUrlChanged(this._panelUrl!);
      this._updateHass({ panelUrl: this._panelUrl });
    }
    if (changedProps.has("hass")) {
      this.hassChanged(this.hass!, changedProps.get("hass") as
        | HomeAssistant
        | undefined);
    }
  }

  private _routeChanged(ev) {
    const route = ev.detail.value as Route;
    // If it's the first route that we process,
    // check if we should navigate away from /
    if (
      this._route === undefined &&
      (route.path === "" || route.path === "/")
    ) {
      navigate(window, `/${localStorage.defaultPage || DEFAULT_PANEL}`, true);
      return;
    }

    this._route = route;

    const dividerPos = route.path.indexOf("/", 1);
    this._panelUrl =
      dividerPos === -1
        ? route.path.substr(1)
        : route.path.substr(1, dividerPos - 1);
  }
}

customElements.define("home-assistant", HomeAssistantAppEl);
