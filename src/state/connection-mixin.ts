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
import { computeStateName } from "../common/entity/compute_state_name";
import { promiseTimeout } from "../common/util/promise-timeout";
import { subscribeAreaRegistry } from "../data/area/area_registry";
import { broadcastConnectionStatus } from "../data/connection-status";
import { subscribeDeviceRegistry } from "../data/device/device_registry";
import {
  subscribeFrontendSystemData,
  subscribeFrontendUserData,
} from "../data/frontend";
import { forwardHaptic } from "../data/haptics";
import { serviceCallWillDisconnect } from "../data/service";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../data/translation";
import { subscribeEntityRegistryDisplay } from "../data/ws-entity_registry_display";
import { deepEqual } from "../common/util/deep-equal";
import { preserveUnchangedRecord } from "../common/util/preserve-unchanged-record";
import { subscribeFloorRegistry } from "../data/ws-floor_registry";
import { subscribePanels } from "../data/ws-panels";
import { translationMetadata } from "../resources/translations-metadata";
import type { Constructor, HomeAssistant, ServiceCallResponse } from "../types";
import {
  addBrandsAuth,
  clearBrandsTokenRefresh,
  fetchAndScheduleBrandsAccessToken,
} from "../util/brands-url";
import { getLocalLanguage } from "../util/common-translation";
import { fetchWithAuth } from "../util/fetch-with-auth";
import { getState } from "../util/ha-pref-storage";
import hassCallApi, { hassCallApiRaw } from "../util/hass-call-api";
import { callWS, setDebugConnection } from "../util/websocket";
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
        userData: undefined,
        systemData: undefined,
        panelUrl: (this as any)._panelUrl,
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
        localize: () => "",
        translationMetadata,
        kioskMode: false,
        dockedSidebar: "docked",
        vibrate: true,
        debugConnection: __DEV__,
        suspendWhenHidden: true,
        enableShortcuts: true,
        hassUrl: (path = "") =>
          addBrandsAuth(
            new URL(path, auth.data.hassUrl).toString(),
            auth.data.hassUrl
          ),
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
              forwardHaptic(this, "failure");
              const localize = await this.hass!.loadBackendTranslation(
                "exceptions",
                err.translation_domain
              );
              const localizedErrorMessage = localize(
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
        callWS: <R>(msg) => callWS<R>(conn, msg),
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
        formatEntityStateToParts: (stateObj, state) => [
          {
            type: "value",
            value: (state != null ? state : stateObj.state) ?? "",
          },
        ],
        formatEntityAttributeName: (_stateObj, attribute) => attribute,
        formatEntityAttributeValue: (stateObj, attribute, value) =>
          value != null ? value : (stateObj.attributes[attribute] ?? ""),
        formatEntityAttributeValueToParts: (stateObj, attribute, value) => [
          {
            type: "value",
            value:
              value != null ? value : (stateObj.attributes[attribute] ?? ""),
          },
        ],
        formatEntityName: (stateObj) => computeStateName(stateObj),
        ...getState(),
        ...this._pendingHass,
      };

      setDebugConnection(this.hass.debugConnection);

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
        const updatedEntities = preserveUnchangedRecord(
          this.hass?.entities,
          entities,
          deepEqual
        );
        // When the display payload is unchanged (a registry event that doesn't
        // touch it), skip the update entirely instead of churning a new hass.
        if (updatedEntities !== this.hass?.entities) {
          this._updateHass({ entities: updatedEntities });
        }
      });
      subscribeDeviceRegistry(conn, (deviceReg) => {
        const devices: HomeAssistant["devices"] = {};
        for (const device of deviceReg) {
          devices[device.id] = device;
        }
        const updatedDevices = preserveUnchangedRecord(
          this.hass?.devices,
          devices,
          deepEqual
        );
        if (updatedDevices !== this.hass?.devices) {
          this._updateHass({ devices: updatedDevices });
        }
      });
      subscribeAreaRegistry(conn, (areaReg) => {
        const areas: HomeAssistant["areas"] = {};
        for (const area of areaReg) {
          areas[area.area_id] = area;
        }
        const updatedAreas = preserveUnchangedRecord(
          this.hass?.areas,
          areas,
          deepEqual
        );
        if (updatedAreas !== this.hass?.areas) {
          this._updateHass({ areas: updatedAreas });
        }
      });
      subscribeFloorRegistry(conn, (floorReg) => {
        const floors: HomeAssistant["floors"] = {};
        for (const floor of floorReg) {
          floors[floor.floor_id] = floor;
        }
        const updatedFloors = preserveUnchangedRecord(
          this.hass?.floors,
          floors,
          deepEqual
        );
        if (updatedFloors !== this.hass?.floors) {
          this._updateHass({ floors: updatedFloors });
        }
      });
      subscribeConfig(conn, (config) => this._updateHass({ config }));
      subscribeServices(conn, (services) => this._updateHass({ services }));
      subscribePanels(conn, (panels) => this._updateHass({ panels }));
      // Catch errors to userData and systemData subscription (e.g. if the
      // backend isn't up to date) and set to null so frontend can continue
      subscribeFrontendUserData(conn, "core", ({ value: userData }) =>
        this._updateHass({ userData: userData || {} })
      ).catch(() => {
        // eslint-disable-next-line no-console
        console.error(
          "Failed to subscribe to user data, setting to empty object"
        );
        this._updateHass({ userData: {} });
      });
      subscribeFrontendSystemData(conn, "core", ({ value: systemData }) =>
        this._updateHass({ systemData: systemData || {} })
      ).catch(() => {
        // eslint-disable-next-line no-console
        console.error(
          "Failed to subscribe to system data, setting to empty object"
        );
        this._updateHass({ systemData: {} });
      });
      clearInterval(this.__backendPingInterval);

      this._refreshBrandsAccessToken();

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

      this._refreshBrandsAccessToken();

      // on reconnect always fetch config as we might miss an update while we were disconnected
      // @ts-ignore
      this.hass!.callWS({ type: "get_config" }).then((config: HassConfig) => {
        if (config.safe_mode) {
          // @ts-ignore Firefox supports forceGet
          location.reload(true);
        }
        this._updateHass({ config });
        this.checkDataBaseMigration();
        this.checkHttpPendingConfig();
      });
    }

    protected hassDisconnected() {
      super.hassDisconnected();
      this._updateHass({ connected: false });
      broadcastConnectionStatus("disconnected");
      clearInterval(this.__backendPingInterval);
      clearBrandsTokenRefresh();
    }

    private async _refreshBrandsAccessToken() {
      // The brands WS handler may not be registered yet after a server restart;
      // fetchAndScheduleBrandsAccessToken retries internally. If the token
      // changed, re-render so any brand <img> elements that rendered against a
      // different (or missing) token recompute their src and re-fetch.
      const changed = await fetchAndScheduleBrandsAccessToken(this.hass!);
      if (changed) {
        this._updateHass({});
      }
    }
  };
