import type { Auth, Connection, HassConfig } from "home-assistant-js-websocket";
import {
  callService,
  ERR_CONNECTION_LOST,
  ERR_INVALID_AUTH,
  subscribeConfig,
  subscribeEntities,
  subscribeServices,
} from "home-assistant-js-websocket";
import { fireEvent } from "../common/dom/fire_event";
import { promiseTimeout } from "../common/util/promise-timeout";
import { subscribeAreaRegistry } from "../data/area_registry";
import { broadcastConnectionStatus } from "../data/connection-status";
import { subscribeDeviceRegistry } from "../data/device_registry";
import { subscribeFrontendUserData } from "../data/frontend";
import { forwardHaptic } from "../data/haptics";
import { DEFAULT_PANEL } from "../data/panel";
import { serviceCallWillDisconnect } from "../data/service";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../data/translation";
import { subscribeEntityRegistryDisplay } from "../data/ws-entity_registry_display";
import { subscribeFloorRegistry } from "../data/ws-floor_registry";
import { subscribePanels } from "../data/ws-panels";
import { translationMetadata } from "../resources/translations-metadata";
import type { Constructor, HomeAssistant, ServiceCallResponse } from "../types";
import { getLocalLanguage } from "../util/common-translation";
import { fetchWithAuth } from "../util/fetch-with-auth";
import { getState } from "../util/ha-pref-storage";
import hassCallApi, { hassCallApiRaw } from "../util/hass-call-api";
import type { HassBaseEl } from "./hass-base-mixin";

export const connectionMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    private __backendPingInterval?: ReturnType<typeof setInterval>;

    protected initializeHass(auth: Auth, conn: Connection) {
      const language = getLocalLanguage();

      this.hass = {
        auth,
        connection: conn,
        connected: true,
        states: null as any,
        entities: null as any,
        devices: null as any,
        areas: null as any,
        floors: null as any,
        config: null as any,
        themes: null as any,
        selectedTheme: null,
        panels: null as any,
        services: null as any,
        user: null as any,
        panelUrl: (this as any)._panelUrl,
        sidebar: {
          defaultPanel: DEFAULT_PANEL,
          hiddenPanels: [],
          panelOrder: [],
        },
        language,
        selectedLanguage: null,
        locale: {
          language,
          number_format: NumberFormat.language,
          time_format: TimeFormat.language,
          date_format: DateFormat.language,
          time_zone: TimeZone.local,
          first_weekday: FirstWeekday.language,
        },
        resources: null as any,
        localize: () => "",

        translationMetadata,
        dockedSidebar: "docked",
        vibrate: true,
        debugConnection: __DEV__,
        suspendWhenHidden: true,
        enableShortcuts: true,
        moreInfoEntityId: null,
        hassUrl: (path = "") => new URL(path, auth.data.hassUrl).toString(),
        callService: async (
          domain,
          service,
          serviceData,
          target,
          notifyOnError = true,
          returnResponse = false
        ) => {
          if (this.hass?.debugConnection) {
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
              serviceData ?? {},
              target,
              returnResponse
            )) as ServiceCallResponse;
          } catch (err: any) {
            if (
              err.error?.code === ERR_CONNECTION_LOST &&
              serviceCallWillDisconnect(domain, service, serviceData)
            ) {
              return { context: { id: "" } };
            }
            if (this.hass?.debugConnection) {
              // eslint-disable-next-line no-console
              console.error(
                "Error calling service",
                domain,
                service,
                serviceData,
                target
              );
            }
            if (notifyOnError) {
              forwardHaptic("failure");
              const lokalize = await this.hass!.loadBackendTranslation(
                "exceptions",
                err.translation_domain
              );
              const localizedErrorMessage = lokalize(
                `component.${err.translation_domain}.exceptions.${err.translation_key}.message`,
                err.translation_placeholders
              );
              const message =
                localizedErrorMessage ||
                (this as any).hass.localize(
                  "ui.notification_toast.action_failed",
                  "service",
                  `${domain}/${service}`
                ) +
                  ` ${
                    err.message ||
                    (err.error?.code === ERR_CONNECTION_LOST
                      ? "connection lost"
                      : "unknown error")
                  }`;
              fireEvent(this as any, "hass-notification", {
                message,
                duration: 10000,
              });
            }
            throw err;
          }
        },
        callApi: async (method, path, parameters, headers) =>
          hassCallApi(auth, method, path, parameters, headers),
        // callApiRaw introduced in 2024.11
        callApiRaw: async (method, path, parameters, headers, signal) =>
          hassCallApiRaw(auth, method, path, parameters, headers, signal),
        fetchWithAuth: (
          path: string,
          init: Parameters<typeof fetchWithAuth>[2]
        ) => fetchWithAuth(auth, `${auth.data.hassUrl}${path}`, init),
        // For messages that do not get a response
        sendWS: (msg) => {
          if (this.hass?.debugConnection) {
            // eslint-disable-next-line no-console
            console.log("Sending", msg);
          }
          conn.sendMessage(msg);
        },
        // For messages that expect a response
        callWS: <R>(msg) => {
          if (this.hass?.debugConnection) {
            // eslint-disable-next-line no-console
            console.log("Sending", msg);
          }

          const resp = conn.sendMessagePromise<R>(msg);

          if (this.hass?.debugConnection) {
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
        loadFragmentTranslation: (fragment) =>
          // @ts-ignore
          this._loadFragmentTranslations(this.hass?.language, fragment),
        formatEntityState: (stateObj, state) =>
          (state != null ? state : stateObj.state) ?? "",
        formatEntityAttributeName: (_stateObj, attribute) => attribute,
        formatEntityAttributeValue: (stateObj, attribute, value) =>
          value != null ? value : (stateObj.attributes[attribute] ?? ""),
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
      subscribeEntityRegistryDisplay(conn, (entityReg) => {
        const entities: HomeAssistant["entities"] = {};
        for (const entity of entityReg.entities) {
          entities[entity.ei] = {
            entity_id: entity.ei,
            device_id: entity.di,
            area_id: entity.ai,
            labels: entity.lb,
            translation_key: entity.tk,
            platform: entity.pl,
            entity_category:
              entity.ec !== undefined
                ? entityReg.entity_categories[entity.ec]
                : undefined,
            has_entity_name: entity.hn,
            name: entity.en,
            icon: entity.ic,
            hidden: entity.hb,
            display_precision: entity.dp,
          };
        }
        this._updateHass({ entities });
      });
      subscribeDeviceRegistry(conn, (deviceReg) => {
        const devices: HomeAssistant["devices"] = {};
        for (const device of deviceReg) {
          devices[device.id] = device;
        }
        this._updateHass({ devices });
      });
      subscribeAreaRegistry(conn, (areaReg) => {
        const areas: HomeAssistant["areas"] = {};
        for (const area of areaReg) {
          areas[area.area_id] = area;
        }
        this._updateHass({ areas });
      });
      subscribeFloorRegistry(conn, (floorReg) => {
        const floors: HomeAssistant["floors"] = {};
        for (const floor of floorReg) {
          floors[floor.floor_id] = floor;
        }
        this._updateHass({ floors });
      });
      subscribeConfig(conn, (config) => this._updateHass({ config }));
      subscribeServices(conn, (services) => this._updateHass({ services }));
      subscribePanels(conn, (panels) => this._updateHass({ panels }));
      subscribeFrontendUserData(conn, "core", ({ value: userData }) => {
        this._updateHass({ userData });
      });

      clearInterval(this.__backendPingInterval);
      this.__backendPingInterval = setInterval(() => {
        if (this.hass?.connected) {
          // If the backend is busy, or the connection is latent,
          // it can take more than 10 seconds for the ping to return.
          // We give it a 15 second timeout to be safe.
          promiseTimeout(15000, this.hass?.connection.ping()).catch(() => {
            if (!this.hass?.connected) {
              return;
            }

            // eslint-disable-next-line no-console
            console.log("Websocket died, forcing reconnect...");
            this.hass?.connection.reconnect(true);
          });
        }
      }, 30000);
    }

    protected hassReconnected() {
      super.hassReconnected();

      this._updateHass({ connected: true });
      broadcastConnectionStatus("connected");

      // on reconnect always fetch config as we might miss an update while we were disconnected
      // @ts-ignore
      this.hass!.callWS({ type: "get_config" }).then((config: HassConfig) => {
        if (config.safe_mode) {
          // @ts-ignore Firefox supports forceGet
          location.reload(true);
        }
        this._updateHass({ config });
        this.checkDataBaseMigration();
      });
    }

    protected hassDisconnected() {
      super.hassDisconnected();
      this._updateHass({ connected: false });
      broadcastConnectionStatus("disconnected");
      clearInterval(this.__backendPingInterval);
    }
  };
