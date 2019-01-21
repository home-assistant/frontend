import "@polymer/app-route/app-location";
import "@polymer/app-route/app-route";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { afterNextRender } from "@polymer/polymer/lib/utils/render-status";
import { html as litHtml, LitElement } from "lit-element";

import "../home-assistant-main";
import "../ha-init-page";
import "../../resources/ha-style";
import registerServiceWorker from "../../util/register-service-worker";
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

LitElement.prototype.html = litHtml;

const ext = (baseClass, mixins) =>
  mixins.reduceRight((base, mixin) => mixin(base), baseClass);

export class HomeAssistant extends ext(PolymerElement, [
  AuthMixin,
  ThemesMixin,
  TranslationsMixin,
  MoreInfoMixin,
  SidebarMixin,
  DisconnectToastMixin,
  ConnectionMixin,
  NotificationMixin,
  dialogManagerMixin,
  HassBaseMixin,
]) {
  static get template() {
    return html`
      <app-location
        route="{{route}}"
        use-hash-as-path="[[_useHashAsPath]]"
      ></app-location>
      <app-route
        route="[[route]]"
        pattern="/:panel"
        data="{{routeData}}"
        tail="{{subroute}}"
      ></app-route>
      <template is="dom-if" if="[[showMain]]" restamp>
        <home-assistant-main
          hass="[[hass]]"
          route="[[route]]"
          tail="[[subroute]]"
        ></home-assistant-main>
      </template>

      <template is="dom-if" if="[[!showMain]]" restamp>
        <ha-init-page error="[[_error]]"></ha-init-page>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        value: null,
      },
      showMain: {
        type: Boolean,
        computed: "computeShowMain(hass)",
      },
      route: Object,
      routeData: Object,
      panelUrl: {
        type: String,
        computed: "computePanelUrl(routeData)",
        observer: "panelUrlChanged",
      },
      _error: {
        type: Boolean,
        value: false,
      },
    };
  }

  ready() {
    super.ready();
    afterNextRender(null, registerServiceWorker);
  }

  computeShowMain(hass) {
    return hass && hass.states && hass.config && hass.panels && hass.services;
  }

  computePanelUrl(routeData) {
    return (
      (routeData && routeData.panel) ||
      localStorage.defaultPage ||
      DEFAULT_PANEL
    );
  }

  get _useHashAsPath() {
    return __DEMO__;
  }

  panelUrlChanged(newPanelUrl) {
    super.panelUrlChanged(newPanelUrl);
    this._updateHass({ panelUrl: newPanelUrl });
  }
}

customElements.define("home-assistant", HomeAssistant);
