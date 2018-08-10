import '@polymer/app-route/app-location.js';
import '@polymer/app-route/app-route.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';

import {
  ERR_INVALID_AUTH,
  subscribeEntities,
  subscribeConfig,
} from 'home-assistant-js-websocket';

import LocalizeMixin from '../../mixins/localize-mixin.js';
import translationMetadata from '../../../build-translations/translationMetadata.json';
import '../../layouts/home-assistant-main.js';
import '../../resources/ha-style.js';
import { getState, storeState, clearState } from '../../util/ha-pref-storage.js';
import { getActiveTranslation } from '../../util/hass-translation.js';
import hassCallApi from '../../util/hass-call-api.js';
import makeDialogManager from '../../dialogs/dialog-manager.js';
import registerServiceWorker from '../../util/register-service-worker.js';

import computeStateName from '../../common/entity/compute_state_name.js';

import hassBaseMixin from './hass-base-mixin.js';
import authMixin from './auth-mixin.js';
import translationsMixin from './translations-mixin.js';
import themesMixin from './themes-mixin.js';

import(/* webpackChunkName: "login-form" */ '../../layouts/login-form.js');
import(/* webpackChunkName: "notification-manager" */ '../../managers/notification-manager.js');


class HomeAssistant extends
  LocalizeMixin(authMixin(themesMixin(translationsMixin(hassBaseMixin(PolymerElement))))) {
  static get template() {
    return html`
    <notification-manager id="notifications" hass="[[hass]]"></notification-manager>
    <app-location route="{{route}}"></app-location>
    <app-route
      route="{{route}}"
      pattern="/:panel"
      data="{{routeData}}"
    ></app-route>
    <template is="dom-if" if="[[showMain]]" restamp="">
      <home-assistant-main
        on-hass-more-info="handleMoreInfo"
        on-hass-dock-sidebar="handleDockSidebar"
        on-hass-notification="handleNotification"
        on-hass-logout="handleLogout"
        hass="[[hass]]"
        route="{{route}}"
      ></home-assistant-main>
    </template>

    <template is="dom-if" if="[[!showMain]]" restamp="">
      <login-form
        hass="[[hass]]"
        connection-promise="{{connectionPromise}}"
        show-loading="[[computeShowLoading(connectionPromise, hass)]]"
      ></login-form>
    </template>
`;
  }

  static get properties() {
    return {
      connectionPromise: {
        type: Object,
        value: window.hassConnection || null,
        observer: 'handleConnectionPromise',
      },
      connection: {
        type: Object,
        value: null,
        observer: 'connectionChanged',
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

  constructor() {
    super();
    makeDialogManager(this);
    this.unsubFuncs = [];
  }

  ready() {
    super.ready();
    afterNextRender(null, registerServiceWorker);
  }

  computeShowMain(hass) {
    return hass && hass.states && hass.config && hass.panels;
  }

  computeShowLoading(connectionPromise, hass) {
    // Show loading when connecting or when connected but not all pieces loaded yet
    return (connectionPromise != null
      || (hass && hass.connection && (!hass.states || !hass.config)));
  }

  connectionChanged(conn, oldConn) {
    if (oldConn) {
      while (this.unsubFuncs.length) {
        this.unsubFuncs.pop()();
      }
    }
    if (!conn) {
      this._updateHass({
        connection: null,
        connected: false,
        states: null,
        config: null,
        themes: null,
        dockedSidebar: false,
        moreInfoEntityId: null,
        callService: null,
        callApi: null,
        sendWS: null,
        callWS: null,
        user: null,
      });
      return;
    }
    var notifications = this.$.notifications;
    this.hass = Object.assign({
      connection: conn,
      connected: true,
      states: null,
      config: null,
      themes: null,
      panels: null,
      panelUrl: this.panelUrl,

      language: getActiveTranslation(),
      // If resources are already loaded, don't discard them
      resources: (this.hass && this.hass.resources) || null,

      translationMetadata: translationMetadata,
      dockedSidebar: false,
      moreInfoEntityId: null,
      callService: async (domain, service, serviceData = {}) => {
        try {
          await conn.callService(domain, service, serviceData);

          let message;
          let name;
          if (serviceData.entity_id && this.hass.states &&
            this.hass.states[serviceData.entity_id]) {
            name = computeStateName(this.hass.states[serviceData.entity_id]);
          }
          if (service === 'turn_on' && serviceData.entity_id) {
            message = this.localize(
              'ui.notification_toast.entity_turned_on',
              'entity', name || serviceData.entity_id
            );
          } else if (service === 'turn_off' && serviceData.entity_id) {
            message = this.localize(
              'ui.notification_toast.entity_turned_off',
              'entity', name || serviceData.entity_id
            );
          } else {
            message = this.localize(
              'ui.notification_toast.service_called',
              'service', `${domain}/${service}`
            );
          }
          notifications.showNotification(message);
        } catch (err) {
          const msg = this.localize(
            'ui.notification_toast.service_call_failed',
            'service', `${domain}/${service}`
          );
          notifications.showNotification(msg);
          throw err;
        }
      },
      callApi: async (method, path, parameters) => {
        const host = window.location.protocol + '//' + window.location.host;
        const auth = conn.options;
        try {
          // Refresh token if it will expire in 30 seconds
          if (auth.accessToken && Date.now() + 30000 > auth.expires) {
            const accessToken = await window.refreshToken();
            conn.options.accessToken = accessToken.access_token;
            conn.options.expires = accessToken.expires;
          }
          return await hassCallApi(host, auth, method, path, parameters);
        } catch (err) {
          if (!err || err.status_code !== 401 || !auth.accessToken) throw err;

          // If we connect with access token and get 401, refresh token and try again
          const accessToken = await window.refreshToken();
          conn.options.accessToken = accessToken.access_token;
          conn.options.expires = accessToken.expires;
          return await hassCallApi(host, auth, method, path, parameters);
        }
      },
      // For messages that do not get a response
      sendWS: (msg) => {
        // eslint-disable-next-line
        if (__DEV__) console.log('Sending', msg);
        conn.sendMessage(msg);
      },
      // For messages that expect a response
      callWS: (msg) => {
        /* eslint-disable no-console */
        if (__DEV__) console.log('Sending', msg);

        const resp = conn.sendMessagePromise(msg);

        if (__DEV__) {
          resp.then(
            result => console.log('Received', result),
            err => console.log('Error', err),
          );
        }
        // In the future we'll do this as a breaking change
        // inside home-assistant-js-websocket
        return resp.then(result => result.result);
      },
    }, getState());

    this.hassConnected();
  }

  hassConnected() {
    super.hassConnected();

    const conn = this.hass.connection;

    const reconnected = () => this.hassReconnected();
    const disconnected = () => this._updateHass({ connected: false });
    const reconnectError = async (_conn, err) => {
      if (err !== ERR_INVALID_AUTH) return;
      disconnected();
      while (this.unsubFuncs.length) {
        this.unsubFuncs.pop()();
      }
      const accessToken = await window.refreshToken();
      this.handleConnectionPromise(window.createHassConnection(null, accessToken));
    };

    conn.addEventListener('ready', reconnected);
    conn.addEventListener('disconnected', disconnected);
    // If we reconnect after losing connection and access token is no longer
    // valid.
    conn.addEventListener('reconnect-error', reconnectError);

    this.unsubFuncs.push(() => {
      conn.removeEventListener('ready', reconnected);
      conn.removeEventListener('disconnected', disconnected);
      conn.removeEventListener('reconnect-error', reconnectError);
    });

    subscribeEntities(conn, states => this._updateHass({ states }))
      .then(unsub => this.unsubFuncs.push(unsub));

    subscribeConfig(conn, config => this._updateHass({ config }))
      .then(unsub => this.unsubFuncs.push(unsub));

    this._loadPanels();
  }

  hassReconnected() {
    super.hassReconnected();
    this._updateHass({ connected: true });
    this._loadPanels();
  }

  computePanelUrl(routeData) {
    return (routeData && routeData.panel) || 'states';
  }

  panelUrlChanged(newPanelUrl) {
    super.panelUrlChanged(newPanelUrl);
    this._updateHass({ panelUrl: newPanelUrl });
  }

  async handleConnectionPromise(prom) {
    if (!prom) return;

    try {
      this.connection = await prom;
    } catch (err) {
      this.connectionPromise = null;
    }
  }

  handleMoreInfo(ev) {
    ev.stopPropagation();
    this._updateHass({ moreInfoEntityId: ev.detail.entityId });
  }

  handleDockSidebar(ev) {
    ev.stopPropagation();
    this._updateHass({ dockedSidebar: ev.detail.dock });
    storeState(this.hass);
  }

  handleNotification(ev) {
    this.$.notifications.showNotification(ev.detail.message);
  }

  handleLogout() {
    this.connection.close();
    clearState();
    document.location.href = '/';
  }

  async _loadPanels() {
    const panels = await this.hass.callWS({
      type: 'get_panels'
    });
    this._updateHass({ panels });
  }

  _updateHass(obj) {
    this.hass = Object.assign({}, this.hass, obj);
  }
}

customElements.define('home-assistant', HomeAssistant);
