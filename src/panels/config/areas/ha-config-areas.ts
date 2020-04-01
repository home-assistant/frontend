import "./ha-config-areas-dashboard";
import "./ha-config-area-page";
import { compare } from "../../../common/string/compare";
import {
  subscribeAreaRegistry,
  AreaRegistryEntry,
} from "../../../data/area_registry";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { property, customElement, PropertyValues } from "lit-element";
import { HomeAssistant } from "../../../types";
import { ConfigEntry, getConfigEntries } from "../../../data/config_entries";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import { UnsubscribeFunc } from "home-assistant-js-websocket";

@customElement("ha-config-areas")
class HaConfigAreas extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() public showAdvanced!: boolean;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    routes: {
      dashboard: {
        tag: "ha-config-areas-dashboard",
        cache: true,
      },
      area: {
        tag: "ha-config-area-page",
      },
    },
  };

  @property() private _configEntries: ConfigEntry[] = [];
  @property() private _deviceRegistryEntries: DeviceRegistryEntry[] = [];
  @property() private _areas: AreaRegistryEntry[] = [];

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

    if (this._currentPage === "area") {
      pageEl.areaId = this.routeTail.path.substr(1);
    }

    pageEl.entries = this._configEntries;
    pageEl.devices = this._deviceRegistryEntries;
    pageEl.areas = this._areas;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.showAdvanced = this.showAdvanced;
    pageEl.route = this.routeTail;
  }

  private _loadData() {
    getConfigEntries(this.hass).then((configEntries) => {
      this._configEntries = configEntries.sort((conf1, conf2) =>
        compare(conf1.title, conf2.title)
      );
    });
    if (this._unsubs) {
      return;
    }
    this._unsubs = [
      subscribeAreaRegistry(this.hass.connection, (areas) => {
        this._areas = areas;
      }),
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._deviceRegistryEntries = entries;
      }),
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-areas": HaConfigAreas;
  }
}
