import '@polymer/app-route/app-location.js';
import '@polymer/app-route/app-route.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';

import '../../layouts/home-assistant-main.js';
import '../../layouts/ha-init-page.js';
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
import NotificationMixin from './notification-mixin.js';
import DisconnectToastMixin from './disconnect-toast-mixin.js';

const ext = (baseClass, mixins) => mixins.reduceRight((base, mixin) => mixin(base), baseClass);

class HomeAssistant extends ext(PolymerElement, [
  AuthMixin,
  ThemesMixin,
  TranslationsMixin,
  MoreInfoMixin,
  SidebarMixin,
  DisconnectToastMixin,
  ConnectionMixin,
  NotificationMixin,
  DialogManagerMixin,
  HassBaseMixin
]) {
  static get template() {
    return html`
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
      <ha-init-page error='[[_error]]'></ha-init-page>
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
        computed: 'computeShowMain(hass)',
      },
      route: Object,
      routeData: Object,
      panelUrl: {
        type: String,
        computed: 'computePanelUrl(routeData)',
        observer: 'panelUrlChanged',
      },
      _error: {
        type: Boolean,
        value: false,
      }
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
    return (routeData && routeData.panel) || 'states';
  }

  panelUrlChanged(newPanelUrl) {
    super.panelUrlChanged(newPanelUrl);
    this._updateHass({ panelUrl: newPanelUrl });
  }
}

customElements.define('home-assistant', HomeAssistant);
