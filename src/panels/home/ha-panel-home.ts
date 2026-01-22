import { mdiPencil } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../common/navigate";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import { updateAreaRegistryEntry } from "../../data/area/area_registry";
import { updateDeviceRegistryEntry } from "../../data/device/device_registry";
import {
  fetchFrontendSystemData,
  saveFrontendSystemData,
  type HomeFrontendSystemData,
} from "../../data/frontend";
import type { LovelaceDashboardStrategyConfig } from "../../data/lovelace/config/types";
import type { HomeAssistant, PanelInfo, Route } from "../../types";
import { showToast } from "../../util/toast";
import "../lovelace/hui-root";
import type { ExtraActionItem } from "../lovelace/hui-root";
import { expandLovelaceConfigStrategies } from "../lovelace/strategies/get-strategy";
import type { Lovelace } from "../lovelace/types";
import { showAreaRegistryDetailDialog } from "../config/areas/show-dialog-area-registry-detail";
import { showDeviceRegistryDetailDialog } from "../config/devices/device-registry-detail/show-dialog-device-registry-detail";
import { showEditHomeDialog } from "./dialogs/show-dialog-edit-home";

@customElement("ha-panel-home")
class PanelHome extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public route?: Route;

  @property({ attribute: false }) public panel?: PanelInfo;

  @state() private _lovelace?: Lovelace;

  @state() private _config: FrontendSystemData["home"] = {};

  @state() private _extraActionItems?: ExtraActionItem[];

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    // Initial setup
    if (!this.hasUpdated) {
      this._setup();
      return;
    }

    if (changedProps.has("route")) {
      this._updateExtraActionItems();
    }

    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as this["hass"];
    if (oldHass && oldHass.localize !== this.hass.localize) {
      this._setLovelace();
      return;
    }

    if (oldHass && this.hass) {
      // If the entity registry changed, ask the user if they want to refresh the config
      if (
        oldHass.entities !== this.hass.entities ||
        oldHass.devices !== this.hass.devices ||
        oldHass.areas !== this.hass.areas ||
        oldHass.floors !== this.hass.floors
      ) {
        if (this.hass.config.state === "RUNNING") {
          this._debounceRegistriesChanged();
          return;
        }
      }
      // If ha started, refresh the config
      if (
        this.hass.config.state === "RUNNING" &&
        oldHass.config.state !== "RUNNING"
      ) {
        this._setLovelace();
      }
    }
  }

  private async _setup() {
    this._updateExtraActionItems();
    try {
      const [_, data] = await Promise.all([
        this.hass.loadFragmentTranslation("lovelace"),
        fetchFrontendSystemData(this.hass.connection, "home"),
      ]);
      this._config = data || {};
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load favorites:", err);
      this._config = {};
    }
    this._setLovelace();
  }

  private _debounceRegistriesChanged = debounce(
    () => this._registriesChanged(),
    200
  );

  private _registriesChanged = async () => {
    // If on an area view that no longer exists, redirect to overview
    const path = this.route?.path?.split("/")[1];
    if (path?.startsWith("areas-")) {
      const areaId = path.replace("areas-", "");
      if (!this.hass.areas[areaId]) {
        navigate("/home");
        return;
      }
    }
    this._setLovelace();
  };

  private _updateExtraActionItems() {
    const path = this.route?.path?.split("/")[1];

    if (path?.startsWith("areas-")) {
      this._extraActionItems = [
        {
          icon: mdiPencil,
          labelKey: "ui.panel.lovelace.menu.edit_area",
          action: this._editArea,
        },
      ];
    } else if (!path || path === "overview") {
      this._extraActionItems = [
        {
          icon: mdiPencil,
          labelKey: "ui.panel.lovelace.menu.edit_overview",
          action: this._editHome,
        },
      ];
    } else {
      this._extraActionItems = undefined;
    }
  }

  private _editHome = () => {
    showEditHomeDialog(this, {
      config: this._config,
      saveConfig: async (config) => {
        await this._saveConfig(config);
      },
    });
  };

  private _editArea = async () => {
    const path = this.route?.path?.split("/")[1];
    if (!path?.startsWith("areas-")) {
      return;
    }
    const areaId = path.replace("areas-", "");
    const area = this.hass.areas[areaId];
    if (!area) {
      return;
    }
    await this.hass.loadFragmentTranslation("config");
    showAreaRegistryDetailDialog(this, {
      entry: area,
      updateEntry: (values) =>
        updateAreaRegistryEntry(this.hass, areaId, values),
    });
  };

  private _handleLLCustomEvent = (ev: Event) => {
    const detail = (ev as CustomEvent).detail;
    if (detail.home_panel) {
      const { type, device_id } = detail.home_panel;
      if (type === "assign_area") {
        this._showAssignAreaDialog(device_id);
      }
    }
  };

  private _showAssignAreaDialog(deviceId: string) {
    const device = this.hass.devices[deviceId];
    if (!device) {
      return;
    }
    showDeviceRegistryDetailDialog(this, {
      device,
      updateEntry: async (updates) => {
        await updateDeviceRegistryEntry(this.hass, deviceId, updates);
      },
    });
  }

  protected render() {
    if (!this._lovelace) {
      return nothing;
    }

    return html`
      <hui-root
        .hass=${this.hass}
        .narrow=${this.narrow}
        .lovelace=${this._lovelace}
        .route=${this.route}
        .panel=${this.panel}
        no-edit
        .extraActionItems=${this._extraActionItems}
        @ll-custom=${this._handleLLCustomEvent}
      ></hui-root>
    `;
  }

  private async _setLovelace() {
    const strategyConfig: LovelaceDashboardStrategyConfig = {
      strategy: {
        type: "home",
        favorite_entities: this._config.favorite_entities,
        home_panel: true,
      },
    };

    const config = await expandLovelaceConfigStrategies(
      strategyConfig,
      this.hass
    );

    if (deepEqual(config, this._lovelace?.config)) {
      return;
    }

    this._lovelace = {
      config: config,
      rawConfig: config,
      editMode: false,
      urlPath: "home",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
    };
  }

  private async _saveConfig(config: HomeFrontendSystemData): Promise<void> {
    try {
      await saveFrontendSystemData(this.hass.connection, "home", config);
      this._config = config || {};
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Failed to save home configuration:", err);
      showToast(this, {
        message: this.hass.localize("ui.panel.home.editor.save_failed"),
        duration: 0,
        dismissable: true,
      });
      return;
    }
    showToast(this, {
      message: this.hass.localize("ui.common.successfully_saved"),
    });
    this._setLovelace();
  }

  static readonly styles: CSSResultGroup = css`
    :host {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-home": PanelHome;
  }
}
