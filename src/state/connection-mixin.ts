import {
  Auth,
  callService,
  Connection,
  ERR_INVALID_AUTH,
  HassConfig,
  subscribeConfig,
  subscribeEntities,
  subscribeServices,
} from "home-assistant-js-websocket";
import { fireEvent } from "../common/dom/fire_event";
import { broadcastConnectionStatus } from "../data/connection-status";
import { subscribeFrontendUserData } from "../data/frontend";
import { forwardHaptic } from "../data/haptics";
import { DEFAULT_PANEL } from "../data/panel";
import { subscribePanels } from "../data/ws-panels";
import { translationMetadata } from "../resources/translations-metadata";
import { Constructor, ServiceCallResponse } from "../types";
import { fetchWithAuth } from "../util/fetch-with-auth";
import { getState } from "../util/ha-pref-storage";
import hassCallApi from "../util/hass-call-api";
import { getLocalLanguage } from "../util/hass-translation";
import { HassBaseEl } from "./hass-base-mixin";

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
        defaultPanel: DEFAULT_PANEL,
        language: getLocalLanguage(),
        selectedLanguage: null,
        resources: null as any,
        localize: () => "",

        translationMetadata,
        dockedSidebar: "docked",
        vibrate: true,
        suspendWhenHidden: true,
        enableShortcuts: true,
        moreInfoEntityId: null,
        hassUrl: (path = "") => new URL(path, auth.data.hassUrl).toString(),
        callService: async (domain, service, serviceData = {}, target) => {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log(
              "Calling service",
              domain,
              service,
              serviceData,
              target
            );
          }
          try {
            return (await callService(
              conn,
              domain,
              service,
              serviceData,
              target
            )) as Promise<ServiceCallResponse>;
          } catch (err) {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.error(
                "Error calling service",
                domain,
                service,
                serviceData,
                target,
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
        callApi: async (method, path, parameters, headers) =>
          hassCallApi(auth, method, path, parameters, headers),
        fetchWithAuth: (
          path: string,
          init: Parameters<typeof fetchWithAuth>[2]
        ) => fetchWithAuth(auth, `${auth.data.hassUrl}${path}`, init),
        // For messages that do not get a response
        sendWS: (msg) => {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log("Sending", msg);
          }
          conn.sendMessage(msg);
        },
        // For messages that expect a response
        callWS: <R>(msg) => {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log("Sending", msg);
          }

          const resp = conn.sendMessagePromise<R>(msg);

          if (__DEV__) {
            resp.then(
              // eslint-disable-next-line no-console
              (result) => console.log("Received", result),
              // eslint-disable-next-line no-console
              (err) => console.error("Error", err)
            );
          }
          return resp;
        },
        loadBackendTranslation: (category, integration?, configFlow?) =>
          // @ts-ignore
          this._loadHassTranslations(
            this.hass?.language,
            category,
            integration,
            configFlow
          ),
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
      subscribeFrontendUserData(conn, "core", (userData) =>
        this._updateHass({ userData })
      );
    }

    protected hassReconnected() {
      super.hassReconnected();

      this._updateHass({ connected: true });
      broadcastConnectionStatus("connected");

      // on reconnect always fetch config as we might miss an update while we were disconnected
      // @ts-ignore
      this.hass!.callWS({ type: "get_config" }).then((config: HassConfig) => {
        this._updateHass({ config });
      });
    }

    protected hassDisconnected() {
      super.hassDisconnected();
      this._updateHass({ connected: false });
      broadcastConnectionStatus("disconnected");
    }
  };
