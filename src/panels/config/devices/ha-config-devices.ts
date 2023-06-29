import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../../data/area_registry";
import { ConfigEntry, getConfigEntries } from "../../../data/config_entries";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import {
  IntegrationDescriptions,
  getIntegrationDescriptions,
} from "../../../data/integrations";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../types";
import "./ha-config-device-page";
import "./ha-config-devices-dashboard";

@customElement("ha-config-devices")
class HaConfigDevices extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    routes: {
      dashboard: {
        tag: "ha-config-devices-dashboard",
        cache: true,
      },
      device: {
        tag: "ha-config-device-page",
      },
    },
  };

  @state() private _configEntries: ConfigEntry[] = [];

  @state() private _descriptions?: IntegrationDescriptions;

  @state()
  private _entityRegistryEntries: EntityRegistryEntry[] = [];

  @state()
  private _deviceRegistryEntries: DeviceRegistryEntry[] = [];

  @state() private _areas: AreaRegistryEntry[] = [];

  private _unsubs?: UnsubscribeFunc[];

  public connectedCallback() {
    super.connectedCallback();

    if (!this.hass) {
      return;
    }
    this._loadData();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubs) {
      while (this._unsubs.length) {
        this._unsubs.pop()!();
      }
      this._unsubs = undefined;
    }
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.addEventListener("hass-reload-entries", () => {
      this._loadData();
    });
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!this._unsubs && changedProps.has("hass")) {
      this._loadData();
    }
  }

  protected updatePageEl(pageEl) {
    pageEl.hass = this.hass;

    if (this._currentPage === "device") {
      pageEl.deviceId = this.routeTail.path.substr(1);
    }

    pageEl.entities = this._entityRegistryEntries;
    pageEl.entries = this._sortedConfigEntries(
      this._configEntries,
      this._descriptions
    );
    pageEl.devices = this._deviceRegistryEntries;
    pageEl.areas = this._areas;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.showAdvanced = this.showAdvanced;
    pageEl.route = this.routeTail;
  }

  private _sortedConfigEntries = memoizeOne(
    (
      configEntries: ConfigEntry[],
      descriptions?: IntegrationDescriptions
    ): ConfigEntry[] => {
      const sortedConfigEntries = [...configEntries];

      const getScore = (entry: ConfigEntry) => {
        const isHelper =
          descriptions &&
          (descriptions.core.helper[entry.domain] ||
            descriptions.custom.helper[entry.domain]);
        return isHelper ? -1 : 1;
      };

      const configEntriesCompare = (a: ConfigEntry, b: ConfigEntry) =>
        getScore(b) - getScore(a);

      return sortedConfigEntries.sort(configEntriesCompare);
    }
  );

  private _loadData() {
    getConfigEntries(this.hass).then((configEntries) => {
      this._configEntries = configEntries;
    });
    getIntegrationDescriptions(this.hass).then((descriptions) => {
      this._descriptions = descriptions;
    });

    if (this._unsubs) {
      return;
    }
    this._unsubs = [
      subscribeAreaRegistry(this.hass.connection, (areas) => {
        this._areas = areas;
      }),
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        this._entityRegistryEntries = entries;
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._deviceRegistryEntries = entries;
      }),
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-devices": HaConfigDevices;
  }
}
