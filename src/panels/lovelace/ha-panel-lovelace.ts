import deepFreeze from "deep-freeze";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import {
  addSearchParam,
  removeSearchParam,
} from "../../common/url/search-params";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import { domainToName } from "../../data/integration";
import { subscribeLovelaceUpdates } from "../../data/lovelace";
import type {
  LovelaceConfig,
  LovelaceDashboardStrategyConfig,
  LovelaceRawConfig,
} from "../../data/lovelace/config/types";
import {
  deleteConfig,
  fetchConfig,
  isStrategyDashboard,
  saveConfig,
} from "../../data/lovelace/config/types";
import { fetchResources } from "../../data/lovelace/resource";
import type { WindowWithPreloads } from "../../data/preloads";
import "../../layouts/hass-error-screen";
import "../../layouts/hass-loading-screen";
import type { ShowToastParams } from "../../managers/notification-manager";
import type { HomeAssistant, PanelInfo, Route } from "../../types";
import { showToast } from "../../util/toast";
import { checkLovelaceConfig } from "./common/check-lovelace-config";
import { loadLovelaceResources } from "./common/load-resources";
import { showSaveDialog } from "./editor/show-save-config-dialog";
import "./hui-root";
import "../../components/ha-button";
import { generateLovelaceDashboardStrategy } from "./strategies/get-strategy";
import type { Lovelace } from "./types";

(window as any).loadCardHelpers = () => import("./custom-card-helpers");

const DEFAULT_CONFIG: LovelaceDashboardStrategyConfig = {
  strategy: {
    type: "original-states",
  },
};

interface LovelacePanelConfig {
  mode: "yaml" | "storage";
}

let editorLoaded = false;
let resourcesLoaded = false;

declare global {
  interface HASSDomEvents {
    "strategy-config-changed": undefined;
  }
}

@customElement("ha-panel-lovelace")
export class LovelacePanel extends LitElement {
  @property({ attribute: false }) public panel?: PanelInfo<LovelacePanelConfig>;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route?: Route;

  @state() private _panelState: "loading" | "loaded" | "error" | "yaml-editor" =
    "loading";

  @state() private _errorMsg?: string;

  @state() private lovelace?: Lovelace;

  private _ignoreNextUpdateEvent = false;

  private _fetchConfigOnConnect = false;

  private _unsubUpdates?: Promise<UnsubscribeFunc>;

  private _loading = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (
      this.lovelace &&
      this.hass &&
      this.lovelace.locale !== this.hass.locale
    ) {
      // language has been changed, rebuild UI
      this._setLovelaceConfig(
        this.lovelace.config,
        this.lovelace.rawConfig,
        this.lovelace.mode
      );
    } else if (this.lovelace && this.lovelace.mode === "generated") {
      // When lovelace is generated, we re-generate each time a user goes
      // to the states panel to make sure new entities are shown.
      this._panelState = "loading";
      this._regenerateConfig();
    } else if (this._fetchConfigOnConnect) {
      // Config was changed when we were not at the lovelace panel
      this._fetchConfig(false);
    }
    window.addEventListener("connection-status", this._handleConnectionStatus);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    // On the main dashboard we want to stay subscribed as that one is cached.
    if (this.urlPath !== null && this._unsubUpdates) {
      this._unsubUpdates.then((unsub) => unsub());
      this._unsubUpdates = undefined;
    }
    // reload lovelace on reconnect so we are sure we have the latest config
    window.removeEventListener(
      "connection-status",
      this._handleConnectionStatus
    );
  }

  protected render(): TemplateResult | undefined {
    const panelState = this._panelState;

    if (panelState === "loaded") {
      return html`
        <hui-root
          .panel=${this.panel}
          .hass=${this.hass}
          .lovelace=${this.lovelace}
          .route=${this.route}
          .narrow=${this.narrow}
          @config-refresh=${this._forceFetchConfig}
          @strategy-config-changed=${this._strategyConfigChanged}
        ></hui-root>
      `;
    }

    if (panelState === "error") {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          title=${domainToName(this.hass!.localize, "lovelace")}
          .error=${this._errorMsg}
        >
          <ha-button @click=${this._forceFetchConfig}>
            ${this.hass!.localize("ui.panel.lovelace.reload_lovelace")}
          </ha-button>
        </hass-error-screen>
      `;
    }

    if (panelState === "yaml-editor") {
      return html`
        <hui-editor
          .narrow=${this.narrow}
          .hass=${this.hass}
          .lovelace=${this.lovelace}
          .closeEditor=${this._closeEditor}
        ></hui-editor>
      `;
    }

    return html`
      <hass-loading-screen
        rootnav
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></hass-loading-screen>
    `;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!this.lovelace && this._panelState !== "error" && !this._loading) {
      this._fetchConfig(false);
    }
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    if (!this._unsubUpdates) {
      this._subscribeUpdates();
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (!changedProperties.has("hass")) {
      return;
    }

    const oldHass = changedProperties.get("hass") as HomeAssistant | undefined;
    if (
      oldHass &&
      this.hass &&
      this.lovelace &&
      isStrategyDashboard(this.lovelace.rawConfig)
    ) {
      // If the entity registry changed, ask the user if they want to refresh the config
      if (
        oldHass.entities !== this.hass.entities ||
        oldHass.devices !== this.hass.devices ||
        oldHass.areas !== this.hass.areas ||
        oldHass.floors !== this.hass.floors
      ) {
        if (this.hass.config.state === "RUNNING") {
          this._debounceRegistriesChanged();
        }
      }
      // If ha started, refresh the config
      if (
        this.hass.config.state === "RUNNING" &&
        oldHass.config.state !== "RUNNING"
      ) {
        this._regenerateStrategyConfig();
      }
    }
  }

  private _debounceRegistriesChanged = debounce(
    () => this._registriesChanged(),
    200
  );

  private _registriesChanged = async () => {
    if (!this.hass || !this.lovelace) {
      return;
    }
    const rawConfig = this.lovelace.rawConfig;

    if (!isStrategyDashboard(rawConfig)) {
      return;
    }

    const oldConfig = this.lovelace.config;
    const generatedConfig = await generateLovelaceDashboardStrategy(
      rawConfig,
      this.hass!
    );

    const newConfig = checkLovelaceConfig(generatedConfig) as LovelaceConfig;

    // Ask to regenerate if the config changed
    if (!deepEqual(newConfig, oldConfig)) {
      this._askRegenerateStrategyConfig();
    }
  };

  private _strategyConfigChanged = (ev: CustomEvent) => {
    ev.stopPropagation();
    this._askRegenerateStrategyConfig();
  };

  private _askRegenerateStrategyConfig = () => {
    showToast(this, {
      message: this.hass!.localize("ui.panel.lovelace.changed_toast.message"),
      action: {
        action: () => this._regenerateStrategyConfig(),
        text: this.hass!.localize("ui.common.refresh"),
      },
      duration: -1,
      id: "regenerate-strategy-config",
      dismissable: false,
    });
  };

  private async _regenerateStrategyConfig() {
    if (!this.hass || !this.lovelace) {
      return;
    }

    const rawConf = this.lovelace.rawConfig;

    if (!isStrategyDashboard(rawConf)) {
      return;
    }

    try {
      const conf = await generateLovelaceDashboardStrategy(rawConf, this.hass!);
      this._setLovelaceConfig(conf, rawConf, "generated");
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  private _handleConnectionStatus = (ev) => {
    // reload lovelace on reconnect so we are sure we have the latest config
    if (ev.detail === "connected") {
      this._fetchConfig(false);
    }
  };

  private async _regenerateConfig() {
    const conf = await generateLovelaceDashboardStrategy(
      DEFAULT_CONFIG,
      this.hass!
    );
    this._setLovelaceConfig(conf, DEFAULT_CONFIG, "generated");
    this._panelState = "loaded";
  }

  private async _subscribeUpdates() {
    this._unsubUpdates = subscribeLovelaceUpdates(
      this.hass!.connection,
      this.urlPath,
      () => this._lovelaceChanged()
    );
  }

  private _closeEditor = () => {
    this._panelState = "loaded";
  };

  private _lovelaceChanged() {
    if (this._ignoreNextUpdateEvent) {
      this._ignoreNextUpdateEvent = false;
      return;
    }
    if (!this.isConnected) {
      // We can't fire events from an element that is not connected
      // Make sure we fetch the config as soon as the user goes back to Lovelace
      this._fetchConfigOnConnect = true;
      return;
    }
    showToast(this, {
      message: this.hass!.localize("ui.panel.lovelace.changed_toast.message"),
      action: {
        action: () => this._fetchConfig(false),
        text: this.hass!.localize("ui.common.refresh"),
      },
      duration: -1,
      dismissable: false,
    });
  }

  public get urlPath() {
    return this.panel!.url_path === "lovelace" ? null : this.panel!.url_path;
  }

  private _forceFetchConfig() {
    this._fetchConfig(true);
  }

  private async _fetchConfig(forceDiskRefresh: boolean) {
    this._loading = true;

    let conf: LovelaceConfig;
    let rawConf: LovelaceRawConfig | undefined;
    let confMode: Lovelace["mode"] = this.panel!.config.mode;
    let confProm: Promise<LovelaceRawConfig> | undefined;
    const preloadWindow = window as WindowWithPreloads;

    // On first load, we speed up loading page by having LL promise ready
    if (preloadWindow.llConfProm) {
      confProm = preloadWindow.llConfProm;
      preloadWindow.llConfProm = undefined;
    }
    if (!resourcesLoaded) {
      resourcesLoaded = true;
      (preloadWindow.llResProm || fetchResources(this.hass!.connection)).then(
        (resources) => loadLovelaceResources(resources, this.hass!)
      );
    }

    if (this.urlPath !== null || !confProm) {
      // Refreshing a YAML config can trigger an update event. We will ignore
      // all update events while fetching the config and for 2 seconds after the config is back.
      // We ignore because we already have the latest config.
      if (this.lovelace && this.lovelace.mode === "yaml") {
        this._ignoreNextUpdateEvent = true;
      }

      confProm = fetchConfig(
        this.hass!.connection,
        this.urlPath,
        forceDiskRefresh
      );
    }

    try {
      rawConf = await confProm!;

      // If strategy defined, apply it here.
      if (isStrategyDashboard(rawConf)) {
        if (!this.hass?.entities || !this.hass.devices || !this.hass.areas) {
          // We need these to generate a dashboard, wait for them
          return;
        }
        conf = await generateLovelaceDashboardStrategy(rawConf, this.hass!);
      } else {
        conf = rawConf;
      }
    } catch (err: any) {
      if (err.code !== "config_not_found") {
        // eslint-disable-next-line
        console.log(err);
        this._panelState = "error";
        this._errorMsg = err.message;
        return;
      }
      if (!this.hass?.entities || !this.hass.devices || !this.hass.areas) {
        // We need these to generate a dashboard, wait for them
        return;
      }
      conf = await generateLovelaceDashboardStrategy(
        DEFAULT_CONFIG,
        this.hass!
      );
      rawConf = DEFAULT_CONFIG;
      confMode = "generated";
    } finally {
      this._loading = false;
      // Ignore updates for another 2 seconds.
      if (this.lovelace && this.lovelace.mode === "yaml") {
        setTimeout(() => {
          this._ignoreNextUpdateEvent = false;
        }, 2000);
      }
    }

    this._panelState =
      this._panelState === "yaml-editor" ? this._panelState : "loaded";
    this._setLovelaceConfig(conf, rawConf, confMode);
  }

  private _checkLovelaceConfig(config: LovelaceRawConfig) {
    const checkedConfig = checkLovelaceConfig(config);
    return deepFreeze(checkedConfig);
  }

  private _setLovelaceConfig(
    config: LovelaceConfig,
    rawConfig: LovelaceRawConfig,
    mode: Lovelace["mode"]
  ) {
    config = this._checkLovelaceConfig(config);
    const urlPath = this.urlPath;
    this.lovelace = {
      config,
      rawConfig,
      mode,
      urlPath: this.urlPath,
      editMode: this.lovelace ? this.lovelace.editMode : false,
      locale: this.hass!.locale,
      enableFullEditMode: () => {
        if (!editorLoaded) {
          editorLoaded = true;
          import("./hui-editor");
        }
        this._panelState = "yaml-editor";
      },
      setEditMode: (editMode: boolean) => {
        // If the dashboard is generated (default dashboard)
        // Propose to take control of it
        if (this.lovelace!.mode === "generated" && editMode) {
          showSaveDialog(this, {
            lovelace: this.lovelace!,
            mode: this.panel!.config.mode,
            narrow: this.narrow!,
          });
          return;
        }

        // If we use a strategy for dashboard, we cannot show the edit UI
        // So go straight to the YAML editor
        if (isStrategyDashboard(this.lovelace!.rawConfig) && editMode) {
          this.lovelace!.enableFullEditMode();
          return;
        }

        this._updateLovelace({ editMode });
      },
      saveConfig: async (newConfig: LovelaceRawConfig): Promise<void> => {
        const {
          config: previousConfig,
          rawConfig: previousRawConfig,
          mode: previousMode,
        } = this.lovelace!;
        newConfig = this._checkLovelaceConfig(newConfig);
        let conf: LovelaceConfig;
        // If strategy defined, apply it here.
        if (isStrategyDashboard(newConfig)) {
          conf = await generateLovelaceDashboardStrategy(newConfig, this.hass!);
        } else {
          conf = newConfig;
        }
        try {
          // Optimistic update
          this._updateLovelace({
            config: conf,
            rawConfig: newConfig,
            mode: "storage",
          });
          this._ignoreNextUpdateEvent = true;
          await saveConfig(this.hass!, urlPath, newConfig);
        } catch (err: any) {
          // eslint-disable-next-line
          console.error(err);
          // Rollback the optimistic update
          this._updateLovelace({
            config: previousConfig,
            rawConfig: previousRawConfig,
            mode: previousMode,
          });
          throw err;
        }
      },
      deleteConfig: async (): Promise<void> => {
        const {
          config: previousConfig,
          rawConfig: previousRawConfig,
          mode: previousMode,
        } = this.lovelace!;
        try {
          // Optimistic update
          const generatedConf = await generateLovelaceDashboardStrategy(
            DEFAULT_CONFIG,
            this.hass!
          );
          this._updateLovelace({
            config: generatedConf,
            rawConfig: DEFAULT_CONFIG,
            mode: "generated",
            editMode: false,
          });
          this._ignoreNextUpdateEvent = true;
          await deleteConfig(this.hass!, urlPath);
        } catch (err: any) {
          // eslint-disable-next-line
          console.error(err);
          // Rollback the optimistic update
          this._updateLovelace({
            config: previousConfig,
            rawConfig: previousRawConfig,
            mode: previousMode,
          });
          throw err;
        }
      },
      showToast: (params: ShowToastParams) => showToast(this, params),
    };
  }

  private _updateLovelace(props: Partial<Lovelace>) {
    this.lovelace = {
      ...this.lovelace!,
      ...props,
    };

    if ("editMode" in props) {
      window.history.replaceState(
        null,
        "",
        constructUrlCurrentPath(
          props.editMode
            ? addSearchParam({ edit: "1" })
            : removeSearchParam("edit")
        )
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-lovelace": LovelacePanel;
  }
}
