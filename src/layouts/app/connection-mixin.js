import {
  ERR_INVALID_AUTH,
  subscribeEntities,
  subscribeConfig,
} from 'home-assistant-js-websocket';

import translationMetadata from '../../../build-translations/translationMetadata.json';

import LocalizeMixin from '../../mixins/localize-mixin.js';
import EventsMixin from '../../mixins/events-mixin.js';

import { refreshToken } from '../../common/auth/token.js';
import { getState } from '../../util/ha-pref-storage.js';
import { getActiveTranslation } from '../../util/hass-translation.js';
import hassCallApi from '../../util/hass-call-api.js';
import computeStateName from '../../common/entity/compute_state_name.js';

export default superClass =>
  class extends EventsMixin(LocalizeMixin(superClass)) {
    constructor() {
      super();
      this.unsubFuncs = [];
    }

    ready() {
      super.ready();
      this.addEventListener('try-connection', e =>
        this._handleNewConnProm(e.detail.connProm));
      if (window.hassConnection) {
        this._handleNewConnProm(window.hassConnection);
      }
    }

    async _handleNewConnProm(connProm) {
      this.connectionPromise = connProm;

      let conn;

      try {
        conn = await connProm;
      } catch (err) {
        this.connectionPromise = null;
        return;
      }
      this._setConnection(conn);
    }

    _setConnection(conn) {
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
            this.fire('hass-notification', { message });
          } catch (err) {
            const message = this.localize(
              'ui.notification_toast.service_call_failed',
              'service', `${domain}/${service}`
            );
            this.fire('hass-notification', { message });
            throw err;
          }
        },
        callApi: async (method, path, parameters) => {
          const host = window.location.protocol + '//' + window.location.host;
          const auth = conn.options;
          try {
            // Refresh token if it will expire in 30 seconds
            if (auth.accessToken && Date.now() + 30000 > auth.expires) {
              const accessToken = await refreshToken();
              conn.options.accessToken = accessToken.access_token;
              conn.options.expires = accessToken.expires;
            }
            return await hassCallApi(host, auth, method, path, parameters);
          } catch (err) {
            if (!err || err.status_code !== 401 || !auth.accessToken) throw err;

            // If we connect with access token and get 401, refresh token and try again
            const accessToken = await refreshToken();
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
      const disconnected = () => this.hassDisconnected();
      const reconnectError = async (_conn, err) => {
        if (err !== ERR_INVALID_AUTH) return;

        while (this.unsubFuncs.length) {
          this.unsubFuncs.pop()();
        }
        const accessToken = await refreshToken();
        const newConn = window.createHassConnection(null, accessToken);
        newConn.then(() => this.hassReconnected());
        this._handleNewConnProm(newConn);
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

    hassDisconnected() {
      super.hassDisconnected();
      this._updateHass({ connected: false });
    }

    async _loadPanels() {
      const panels = await this.hass.callWS({
        type: 'get_panels'
      });
      this._updateHass({ panels });
    }
  };
