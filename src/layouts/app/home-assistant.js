import '@polymer/app-route/app-location.js';
import '@polymer/app-route/app-route.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';

import '../../layouts/home-assistant-main.js';
import '../../resources/ha-style.js';
import registerServiceWorker from '../../util/register-service-worker.js';

import HassBaseMixin from './hass-base-mixin.js';
import AuthMixin from './auth-mixin.js';
import TranslationsMixin from './translations-mixin.js';
import ThemesMixin from './themes-mixin.js';
import MoreInfoMixin from './more-info-mixin.js';
import SidebarMixin from './sidebar-mixin.js';
import DialogManagerMixin from './dialog-manager-mixin.js';
import ConnectionMixin from './connection-mixin.js';

import(/* webpackChunkName: "login-form" */ '../../layouts/login-form.js');

const ext = (baseClass, mixins) => mixins.reduceRight((base, mixin) => mixin(base), baseClass);

class HomeAssistant extends ext(PolymerElement, [
  ConnectionMixin,
  DialogManagerMixin,
  AuthMixin,
  ThemesMixin,
  TranslationsMixin,
  MoreInfoMixin,
  SidebarMixin,
  HassBaseMixin
]) {
  static get template() {
    return html`
    <notification-manager id="notifications" hass="[[hass]]"></notification-manager>
    <app-location route="{{route}}"></app-location>
    <app-route
      route="{{route}}"
      pattern="/:panel"
      data="{{routeData}}"
    ></app-route>
    <template is="dom-if" if="[[showMain]]" restamp>
      <home-assistant-main
        hass="[[hass]]"
        route="{{route}}"
      ></home-assistant-main>
    </template>

    <template is="dom-if" if="[[!showMain]]" restamp>
      <login-form
        hass="[[hass]]"
        connection-promise="[[connectionPromise]]"
        show-loading="[[computeShowLoading(connectionPromise, hass)]]"
      ></login-form>
    </template>
`;
  }

  static get properties() {
    return {
      connectionPromise: {
        type: Object,
        value: null,
      },
      hass: {
        type: Object,
        value: null,
      },
      showMain: {
        type: Boolean,
        computed: 'computeShowMain(hass)',
      },
      route: Object,
      routeData: Object,
      panelUrl: {
        type: String,
        computed: 'computePanelUrl(routeData)',
        observer: 'panelUrlChanged',
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener('hass-notification', e => this.handleNotification(e));
    afterNextRender(null, () => {
      registerServiceWorker();
      import(/* webpackChunkName: "notification-manager" */ '../../managers/notification-manager.js');
    });
  }

  computeShowMain(hass) {
    return hass && hass.states && hass.config && hass.panels;
  }

  computeShowLoading(connectionPromise, hass) {
    // Show loading when connecting or when connected but not all pieces loaded yet
    return (connectionPromise != null
      || (hass && hass.connection && (!hass.states || !hass.config)));
  }

  computePanelUrl(routeData) {
    return (routeData && routeData.panel) || 'states';
  }

  panelUrlChanged(newPanelUrl) {
    super.panelUrlChanged(newPanelUrl);
    this._updateHass({ panelUrl: newPanelUrl });
  }

  // async handleConnectionPromise(prom) {
  //   if (!prom) return;

  //   try {
  //     this.connection = await prom;
  //   } catch (err) {
  //     this.connectionPromise = null;
  //   }
  // }

  handleNotification(ev) {
    this.$.notifications.showNotification(ev.detail.message);
  }
}

customElements.define('home-assistant', HomeAssistant);
