import {
  ERR_INVALID_AUTH,
  subscribeEntities,
  subscribeConfig,
  subscribeServices,
  callService,
} from "home-assistant-js-websocket";

import { translationMetadata } from "../../resources/translations-metadata";

import LocalizeMixin from "../../mixins/localize-mixin";
import EventsMixin from "../../mixins/events-mixin";

import { getState } from "../../util/ha-pref-storage";
import {
  getActiveTranslation,
  getLocalTranslation,
} from "../../util/hass-translation";
import { fetchWithAuth } from "../../util/fetch-with-auth";
import hassCallApi from "../../util/hass-call-api";
import computeStateName from "../../common/entity/compute_state_name";
import { subscribePanels } from "../../data/ws-panels";

export default (superClass) =>
  class extends EventsMixin(LocalizeMixin(superClass)) {
    firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this._handleConnProm();
    }

    async _handleConnProm() {
      let auth;
      let conn;
      try {
        const result = await window.hassConnection;
        auth = result.auth;
        conn = result.conn;
      } catch (err) {
        this._error = true;
        return;
      }

      this.hass = Object.assign(
        {
          auth,
          connection: conn,
          connected: true,
          states: null,
          config: null,
          themes: null,
          panels: null,
          services: null,
          user: null,
          panelUrl: this._panelUrl,

          language: getLocalTranslation(),
          // If resources are already loaded, don't discard them
          resources: (this.hass && this.hass.resources) || null,
          localize: () => "",

          translationMetadata: translationMetadata,
          dockedSidebar: false,
          moreInfoEntityId: null,
          callService: async (domain, service, serviceData = {}) => {
            if (__DEV__) {
              // eslint-disable-next-line
              console.log("Calling service", domain, service, serviceData);
            }
            try {
              await callService(conn, domain, service, serviceData);

              const entityIds = Array.isArray(serviceData.entity_id)
                ? serviceData.entity_id
                : [serviceData.entity_id];

              const names = [];
              for (const entityId of entityIds) {
                const stateObj = this.hass.states[entityId];
                if (stateObj) {
                  names.push(computeStateName(stateObj));
                }
              }
              if (names.length === 0) {
                names.push(entityIds[0]);
              }

              let message;
              const name = names.join(", ");
              if (service === "turn_on" && serviceData.entity_id) {
                message = this.hass.localize(
                  "ui.notification_toast.entity_turned_on",
                  "entity",
                  name
                );
              } else if (service === "turn_off" && serviceData.entity_id) {
                message = this.hass.localize(
                  "ui.notification_toast.entity_turned_off",
                  "entity",
                  name
                );
              } else {
                message = this.hass.localize(
                  "ui.notification_toast.service_called",
                  "service",
                  `${domain}/${service}`
                );
              }
              this.fire("hass-notification", { message });
            } catch (err) {
              if (__DEV__) {
                // eslint-disable-next-line
                console.error(
                  "Error calling service",
                  domain,
                  service,
                  serviceData
                );
              }
              const message = this.hass.localize(
                "ui.notification_toast.service_call_failed",
                "service",
                `${domain}/${service}`
              );
              this.fire("hass-notification", { message });
              throw err;
            }
          },
          callApi: async (method, path, parameters) =>
            hassCallApi(auth, method, path, parameters),
          fetchWithAuth: (path, init) =>
            fetchWithAuth(auth, `${auth.data.hassUrl}${path}`, init),
          // For messages that do not get a response
          sendWS: (msg) => {
            if (__DEV__) {
              // eslint-disable-next-line
              console.log("Sending", msg);
            }
            conn.sendMessage(msg);
          },
          // For messages that expect a response
          callWS: (msg) => {
            if (__DEV__) {
              /* eslint-disable no-console */
              console.log("Sending", msg);
            }

            const resp = conn.sendMessagePromise(msg);

            if (__DEV__) {
              resp.then(
                (result) => console.log("Received", result),
                (err) => console.error("Error", err)
              );
            }
            return resp;
          },
        },
        getState()
      );

      getActiveTranslation(this.hass).then((language) => {
        if (this.hass.language !== language) {
          this.fire("hass-language-select", { language, save: false });
        }
      });
      this.hassConnected();
    }

    hassConnected() {
      super.hassConnected();

      const conn = this.hass.connection;

      conn.addEventListener("ready", () => this.hassReconnected());
      conn.addEventListener("disconnected", () => this.hassDisconnected());
      // If we reconnect after losing connection and auth is no longer valid.
      conn.addEventListener("reconnect-error", (_conn, err) => {
        if (err === ERR_INVALID_AUTH) location.reload();
      });

      subscribeEntities(conn, (states) => this._updateHass({ states }));
      subscribeConfig(conn, (config) => this._updateHass({ config }));
      subscribeServices(conn, (services) => this._updateHass({ services }));
      subscribePanels(conn, (panels) => this._updateHass({ panels }));
    }

    hassReconnected() {
      super.hassReconnected();
      this._updateHass({ connected: true });
    }

    hassDisconnected() {
      super.hassDisconnected();
      this._updateHass({ connected: false });
    }
  };
