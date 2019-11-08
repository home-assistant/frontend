import {
  ERR_INVALID_AUTH,
  subscribeEntities,
  subscribeConfig,
  subscribeServices,
  callService,
  Auth,
  Connection,
} from "home-assistant-js-websocket";

import { translationMetadata } from "../resources/translations-metadata";

import { getState } from "../util/ha-pref-storage";
import { getLocalLanguage } from "../util/hass-translation";
import { fetchWithAuth } from "../util/fetch-with-auth";
import hassCallApi from "../util/hass-call-api";
import { subscribePanels } from "../data/ws-panels";
import { forwardHaptic } from "../data/haptics";
import { fireEvent } from "../common/dom/fire_event";
import { Constructor, ServiceCallResponse } from "../types";
import { HassBaseEl } from "./hass-base-mixin";
import { broadcastConnectionStatus } from "../data/connection-status";

export const connectionMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    protected initializeHass(auth: Auth, conn: Connection) {
      this.hass = {
        auth,
        connection: conn,
        connected: true,
        states: null as any,
        config: null as any,
        themes: null as any,
        panels: null as any,
        services: null as any,
        user: null as any,
        panelUrl: (this as any)._panelUrl,

        language: getLocalLanguage(),
        selectedLanguage: null,
        resources: null as any,
        localize: () => "",

        translationMetadata,
        dockedSidebar: "docked",
        vibrate: true,
        moreInfoEntityId: null,
        hassUrl: (path = "") => new URL(path, auth.data.hassUrl).toString(),
        callService: async (domain, service, serviceData = {}) => {
          if (__DEV__) {
            // tslint:disable-next-line: no-console
            console.log("Calling service", domain, service, serviceData);
          }
          try {
            return (await callService(
              conn,
              domain,
              service,
              serviceData
            )) as Promise<ServiceCallResponse>;
          } catch (err) {
            if (__DEV__) {
              // tslint:disable-next-line: no-console
              console.error(
                "Error calling service",
                domain,
                service,
                serviceData,
                err
              );
            }
            forwardHaptic("failure");
            const message =
              (this as any).hass.localize(
                "ui.notification_toast.service_call_failed",
                "service",
                `${domain}/${service}`
              ) + ` ${err.message}`;
            fireEvent(this as any, "hass-notification", { message });
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
            // tslint:disable-next-line: no-console
            console.log("Sending", msg);
          }
          conn.sendMessage(msg);
        },
        // For messages that expect a response
        callWS: <R>(msg) => {
          if (__DEV__) {
            // tslint:disable-next-line: no-console
            console.log("Sending", msg);
          }

          const resp = conn.sendMessagePromise<R>(msg);

          if (__DEV__) {
            resp.then(
              // tslint:disable-next-line: no-console
              (result) => console.log("Received", result),
              // tslint:disable-next-line: no-console
              (err) => console.error("Error", err)
            );
          }
          return resp;
        },
        ...getState(),
        ...this._pendingHass,
      };

      this.hassConnected();
    }

    protected hassConnected() {
      super.hassConnected();

      const conn = this.hass!.connection;

      broadcastConnectionStatus("connected");

      conn.addEventListener("ready", () => this.hassReconnected());
      conn.addEventListener("disconnected", () => this.hassDisconnected());
      // If we reconnect after losing connection and auth is no longer valid.
      conn.addEventListener("reconnect-error", (_conn, err) => {
        if (err === ERR_INVALID_AUTH) {
          broadcastConnectionStatus("auth-invalid");
          location.reload();
        }
      });

      subscribeEntities(conn, (states) => this._updateHass({ states }));
      subscribeConfig(conn, (config) => this._updateHass({ config }));
      subscribeServices(conn, (services) => this._updateHass({ services }));
      subscribePanels(conn, (panels) => this._updateHass({ panels }));
    }

    protected hassReconnected() {
      super.hassReconnected();
      this._updateHass({ connected: true });
      broadcastConnectionStatus("connected");
    }

    protected hassDisconnected() {
      super.hassDisconnected();
      this._updateHass({ connected: false });
      broadcastConnectionStatus("disconnected");
    }
  };
