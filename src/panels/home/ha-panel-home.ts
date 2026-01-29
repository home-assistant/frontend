import { ResizeController } from "@lit-labs/observers/resize-controller";
import { mdiPencil } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { atLeastVersion } from "../../common/config/version";
import { navigate } from "../../common/navigate";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import "../../components/ha-button";
import "../../components/ha-svg-icon";
import { updateAreaRegistryEntry } from "../../data/area/area_registry";
import { updateDeviceRegistryEntry } from "../../data/device/device_registry";
import {
  fetchFrontendSystemData,
  saveFrontendSystemData,
  type HomeFrontendSystemData,
} from "../../data/frontend";
import type { LovelaceDashboardStrategyConfig } from "../../data/lovelace/config/types";
import { mdiHomeAssistant } from "../../resources/home-assistant-logo-svg";
import type { HomeAssistant, PanelInfo, Route } from "../../types";
import { showToast } from "../../util/toast";
import { showAreaRegistryDetailDialog } from "../config/areas/show-dialog-area-registry-detail";
import { showDeviceRegistryDetailDialog } from "../config/devices/device-registry-detail/show-dialog-device-registry-detail";
import { showAddIntegrationDialog } from "../config/integrations/show-add-integration-dialog";
import "../lovelace/hui-root";
import type { ExtraActionItem } from "../lovelace/hui-root";
import { expandLovelaceConfigStrategies } from "../lovelace/strategies/get-strategy";
import type { Lovelace } from "../lovelace/types";
import { showEditHomeDialog } from "./dialogs/show-dialog-edit-home";
import { showNewOverviewDialog } from "./dialogs/show-dialog-new-overview";
import { hasLegacyOverviewPanel } from "../../data/panel";

@customElement("ha-panel-home")
class PanelHome extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public route?: Route;

  @property({ attribute: false }) public panel?: PanelInfo;

  @state() private _lovelace?: Lovelace;

  @state() private _config: FrontendSystemData["home"] = {};

  @state() private _extraActionItems?: ExtraActionItem[];

  private get _showBanner(): boolean {
    // Don't show if already dismissed
    if (this._config.welcome_banner_dismissed) {
      return false;
    }
    // Don't show if HA is not running
    if (this.hass.config.state !== "RUNNING") {
      return false;
    }
    // Show banner only for users who:
    // 1. Were onboarded before 2026.2 (or have no onboarded_version)
    // 2. Don't have a custom "lovelace" dashboard (old overview)
    const onboardedVersion = this.hass.systemData?.onboarded_version;
    const isNewInstance =
      onboardedVersion && atLeastVersion(onboardedVersion, 2026, 2);
    const hasOldOverview = hasLegacyOverviewPanel(this.hass);
    return !isNewInstance && !hasOldOverview;
  }

  private _bannerHeight = new ResizeController(this, {
    target: null,
    callback: (entries) =>
      (entries[0]?.target as HTMLElement | undefined)?.offsetHeight ?? 0,
  });

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
        this._setup();
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
      const { type } = detail.home_panel;
      switch (type) {
        case "assign_area": {
          const { device_id } = detail.home_panel;
          this._showAssignAreaDialog(device_id);
          break;
        }
        case "add_integration": {
          this._showAddIntegrationDialog();
          break;
        }
      }
    }
  };

  private async _showAddIntegrationDialog() {
    await this.hass.loadFragmentTranslation("config");
    showAddIntegrationDialog(this, { navigateToResult: false });
  }

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

    const huiRootStyle = styleMap({
      "--view-container-padding-top": this._bannerHeight.value
        ? `${this._bannerHeight.value}px`
        : undefined,
    });

    return html`
      ${this._renderBanner()}
      <hui-root
        .hass=${this.hass}
        .narrow=${this.narrow}
        .lovelace=${this._lovelace}
        .route=${this.route}
        .panel=${this.panel}
        no-edit
        .extraActionItems=${this._extraActionItems}
        @ll-custom=${this._handleLLCustomEvent}
        style=${huiRootStyle}
      ></hui-root>
    `;
  }

  private _renderBanner() {
    if (!this._showBanner) {
      return nothing;
    }

    return html`
      <div class="banner">
        <div class="banner-content">
          <ha-svg-icon .path=${mdiHomeAssistant}></ha-svg-icon>
          <span class="banner-text">
            Welcome to the new overview dashboard.
          </span>
        </div>
        <div class="banner-actions">
          <ha-button size="small" appearance="filled" @click=${this._learnMore}>
            Learn more
          </ha-button>
        </div>
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_showBanner") || changedProps.has("_lovelace")) {
      const banner = this.shadowRoot?.querySelector(".banner");
      if (banner) {
        this._bannerHeight.observe(banner);
      }
    }
  }

  private _learnMore() {
    showNewOverviewDialog(this, {
      dismiss: async () => {
        const newConfig = {
          ...this._config,
          welcome_banner_dismissed: true,
        };
        this._config = newConfig;
        await saveFrontendSystemData(this.hass.connection, "home", newConfig);
      },
    });
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
    .banner {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      padding: var(--ha-space-2) var(--ha-space-4);
      background-color: var(--primary-color);
      color: var(--text-primary-color);
      gap: var(--ha-space-2);
      position: fixed;
      top: var(--header-height, 56px);
      left: var(--mdc-drawer-width, 0px);
      right: 0;
      z-index: 5;
    }
    .banner-content {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      flex: 1;
      min-width: 200px;
    }
    .banner ha-svg-icon {
      --mdc-icon-size: 24px;
      flex-shrink: 0;
    }
    .banner-text {
      font-size: 14px;
      font-weight: 500;
    }
    .banner-actions {
      display: flex;
      flex: none;
      gap: var(--ha-space-2);
      align-items: center;
      margin-inline-start: auto;
    }
    .banner-actions ha-button::part(base) {
      text-wrap: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-home": PanelHome;
  }
}
