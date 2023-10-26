import "@material/mwc-button";
import deepFreeze from "deep-freeze";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import {
  addSearchParam,
  removeSearchParam,
} from "../../common/url/search-params";
import { domainToName } from "../../data/integration";
import {
  deleteConfig,
  fetchConfig,
  fetchResources,
  LovelaceConfig,
  saveConfig,
  subscribeLovelaceUpdates,
} from "../../data/lovelace";
import { WindowWithPreloads } from "../../data/preloads";
import "../../layouts/hass-error-screen";
import "../../layouts/hass-loading-screen";
import { HomeAssistant, PanelInfo, Route } from "../../types";
import { showToast } from "../../util/toast";
import { loadLovelaceResources } from "./common/load-resources";
import { showSaveDialog } from "./editor/show-save-config-dialog";
import "./hui-root";
import { generateLovelaceDashboardStrategy } from "./strategies/get-strategy";
import { Lovelace } from "./types";

(window as any).loadCardHelpers = () => import("./custom-card-helpers");

const DEFAULT_STRATEGY = "original-states";

interface LovelacePanelConfig {
  mode: "yaml" | "storage";
}

let editorLoaded = false;
let resourcesLoaded = false;

@customElement("ha-panel-lovelace")
export class LovelacePanel extends LitElement {
  @property() public panel?: PanelInfo<LovelacePanelConfig>;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public narrow?: boolean;

  @property() public route?: Route;

  @property()
  private _panelState?: "loading" | "loaded" | "error" | "yaml-editor" =
    "loading";

  @state() private _errorMsg?: string;

  @state() private lovelace?: Lovelace;

  private _ignoreNextUpdateEvent = false;

  private _fetchConfigOnConnect = false;

  private _unsubUpdates?;

  constructor() {
    super();
    this._closeEditor = this._closeEditor.bind(this);
  }

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
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    // On the main dashboard we want to stay subscribed as that one is cached.
    if (this.urlPath !== null && this._unsubUpdates) {
      this._unsubUpdates();
    }
  }

  protected render(): TemplateResult | void {
    const panelState = this._panelState!;

    if (panelState === "loaded") {
      return html`
        <hui-root
          .hass=${this.hass}
          .lovelace=${this.lovelace}
          .route=${this.route}
          .narrow=${this.narrow}
          @config-refresh=${this._forceFetchConfig}
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
          <mwc-button raised @click=${this._forceFetchConfig}>
            ${this.hass!.localize("ui.panel.lovelace.reload_lovelace")}
          </mwc-button>
        </hass-error-screen>
      `;
    }

    if (panelState === "yaml-editor") {
      return html`
        <hui-editor
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

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    this._fetchConfig(false);
    if (!this._unsubUpdates) {
      this._subscribeUpdates();
    }
    // reload lovelace on reconnect so we are sure we have the latest config
    window.addEventListener("connection-status", (ev) => {
      if (ev.detail === "connected") {
        this._fetchConfig(false);
      }
    });
  }

  private async _regenerateConfig() {
    const conf = await generateLovelaceDashboardStrategy(
      {
        type: DEFAULT_STRATEGY,
      },
      this.hass!
    );
    this._setLovelaceConfig(conf, undefined, "generated");
    this._panelState = "loaded";
  }

  private async _subscribeUpdates() {
    this._unsubUpdates = await subscribeLovelaceUpdates(
      this.hass!.connection,
      this.urlPath,
      () => this._lovelaceChanged()
    );
  }

  private _closeEditor() {
    this._panelState = "loaded";
  }

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
      duration: 0,
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
    let conf: LovelaceConfig;
    let rawConf: LovelaceConfig | undefined;
    let confMode: Lovelace["mode"] = this.panel!.config.mode;
    let confProm: Promise<LovelaceConfig> | undefined;
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
      if (rawConf.strategy) {
        conf = await generateLovelaceDashboardStrategy(
          rawConf.strategy,
          this.hass!
        );
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
      conf = await generateLovelaceDashboardStrategy(
        {
          type: DEFAULT_STRATEGY,
        },
        this.hass!
      );
      confMode = "generated";
    } finally {
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

  private _checkLovelaceConfig(config: LovelaceConfig) {
    // Somehow there can be badges with value null, we remove those
    let checkedConfig = !Object.isFrozen(config) ? config : undefined;
    config.views.forEach((view, index) => {
      if (view.badges && !view.badges.every(Boolean)) {
        checkedConfig = checkedConfig || {
          ...config,
          views: [...config.views],
        };
        checkedConfig.views[index] = { ...view };
        checkedConfig.views[index].badges = view.badges.filter(Boolean);
      }
    });
    return checkedConfig ? deepFreeze(checkedConfig) : config;
  }

  private _setLovelaceConfig(
    config: LovelaceConfig,
    rawConfig: LovelaceConfig | undefined,
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
        // If we use a strategy for dashboard, we cannot show the edit UI
        // So go straight to the YAML editor
        if (
          this.lovelace!.rawConfig &&
          this.lovelace!.rawConfig !== this.lovelace!.config
        ) {
          this.lovelace!.enableFullEditMode();
          return;
        }

        if (!editMode || this.lovelace!.mode !== "generated") {
          this._updateLovelace({ editMode });
          return;
        }

        showSaveDialog(this, {
          lovelace: this.lovelace!,
          mode: this.panel!.config.mode,
          narrow: this.narrow!,
        });
      },
      saveConfig: async (newConfig: LovelaceConfig): Promise<void> => {
        const {
          config: previousConfig,
          rawConfig: previousRawConfig,
          mode: previousMode,
        } = this.lovelace!;
        newConfig = this._checkLovelaceConfig(newConfig);
        let conf: LovelaceConfig;
        // If strategy defined, apply it here.
        if (newConfig.strategy) {
          conf = await generateLovelaceDashboardStrategy(
            newConfig.strategy,
            this.hass!
          );
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
            {
              type: DEFAULT_STRATEGY,
            },
            this.hass!
          );
          this._updateLovelace({
            config: generatedConf,
            rawConfig: undefined,
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
