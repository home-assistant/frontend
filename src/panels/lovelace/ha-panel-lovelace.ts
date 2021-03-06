import "@material/mwc-button";
import deepFreeze from "deep-freeze";
import {
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { domainToName } from "../../data/integration";
import {
  deleteConfig,
  fetchConfig,
  fetchResources,
  LovelaceConfig,
  saveConfig,
  subscribeLovelaceUpdates,
  WindowWithLovelaceProm,
} from "../../data/lovelace";
import "../../layouts/hass-error-screen";
import "../../layouts/hass-loading-screen";
import { HomeAssistant, PanelInfo, Route } from "../../types";
import { showToast } from "../../util/toast";
import { generateLovelaceConfigFromHass } from "./common/generate-lovelace-config";
import { loadLovelaceResources } from "./common/load-resources";
import { showSaveDialog } from "./editor/show-save-config-dialog";
import "./hui-root";
import { Lovelace } from "./types";

(window as any).loadCardHelpers = () => import("./custom-card-helpers");

interface LovelacePanelConfig {
  mode: "yaml" | "storage";
}

let editorLoaded = false;
let resourcesLoaded = false;

class LovelacePanel extends LitElement {
  @property() public panel?: PanelInfo<LovelacePanelConfig>;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public narrow?: boolean;

  @property() public route?: Route;

  @property()
  private _state?: "loading" | "loaded" | "error" | "yaml-editor" = "loading";

  @internalProperty() private _errorMsg?: string;

  @internalProperty() private lovelace?: Lovelace;

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
      this.lovelace.language !== this.hass.language
    ) {
      // language has been changed, rebuild UI
      this._setLovelaceConfig(this.lovelace.config, this.lovelace.mode);
    } else if (this.lovelace && this.lovelace.mode === "generated") {
      // When lovelace is generated, we re-generate each time a user goes
      // to the states panel to make sure new entities are shown.
      this._state = "loading";
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
    const state = this._state!;

    if (state === "loaded") {
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

    if (state === "error") {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          title="${domainToName(this.hass!.localize, "lovelace")}"
          .error="${this._errorMsg}"
        >
          <mwc-button raised @click=${this._forceFetchConfig}>
            ${this.hass!.localize("ui.panel.lovelace.reload_lovelace")}
          </mwc-button>
        </hass-error-screen>
      `;
    }

    if (state === "yaml-editor") {
      return html`
        <hui-editor
          .hass=${this.hass}
          .lovelace="${this.lovelace}"
          .closeEditor="${this._closeEditor}"
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

  protected firstUpdated() {
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
    const conf = await generateLovelaceConfigFromHass(this.hass!);
    this._setLovelaceConfig(conf, "generated");
    this._state = "loaded";
  }

  private async _subscribeUpdates() {
    this._unsubUpdates = await subscribeLovelaceUpdates(
      this.hass!.connection,
      this.urlPath,
      () => this._lovelaceChanged()
    );
  }

  private _closeEditor() {
    this._state = "loaded";
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
    let confMode: Lovelace["mode"] = this.panel!.config.mode;
    let confProm: Promise<LovelaceConfig> | undefined;
    const llWindow = window as WindowWithLovelaceProm;

    // On first load, we speed up loading page by having LL promise ready
    if (llWindow.llConfProm) {
      confProm = llWindow.llConfProm;
      llWindow.llConfProm = undefined;
    }
    if (!resourcesLoaded) {
      resourcesLoaded = true;
      (
        llWindow.llConfProm || fetchResources(this.hass!.connection)
      ).then((resources) =>
        loadLovelaceResources(resources, this.hass!.auth.data.hassUrl)
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
      conf = await confProm!;
    } catch (err) {
      if (err.code !== "config_not_found") {
        // eslint-disable-next-line
        console.log(err);
        this._state = "error";
        this._errorMsg = err.message;
        return;
      }
      const localize = await this.hass!.loadBackendTranslation("title");
      conf = await generateLovelaceConfigFromHass(this.hass!, localize);
      confMode = "generated";
    } finally {
      // Ignore updates for another 2 seconds.
      if (this.lovelace && this.lovelace.mode === "yaml") {
        setTimeout(() => {
          this._ignoreNextUpdateEvent = false;
        }, 2000);
      }
    }

    this._state = this._state === "yaml-editor" ? this._state : "loaded";
    this._setLovelaceConfig(conf, confMode);
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

  private _setLovelaceConfig(config: LovelaceConfig, mode: Lovelace["mode"]) {
    config = this._checkLovelaceConfig(config);
    const urlPath = this.urlPath;
    this.lovelace = {
      config,
      mode,
      urlPath: this.urlPath,
      editMode: this.lovelace ? this.lovelace.editMode : false,
      language: this.hass!.language,
      enableFullEditMode: () => {
        if (!editorLoaded) {
          editorLoaded = true;
          import("./hui-editor");
        }
        this._state = "yaml-editor";
      },
      setEditMode: (editMode: boolean) => {
        if (!editMode || this.lovelace!.mode !== "generated") {
          this._updateLovelace({ editMode });
          return;
        }
        showSaveDialog(this, {
          lovelace: this.lovelace!,
          mode: this.panel!.config.mode,
        });
      },
      saveConfig: async (newConfig: LovelaceConfig): Promise<void> => {
        const { config: previousConfig, mode: previousMode } = this.lovelace!;
        newConfig = this._checkLovelaceConfig(newConfig);
        try {
          // Optimistic update
          this._updateLovelace({
            config: newConfig,
            mode: "storage",
          });
          this._ignoreNextUpdateEvent = true;
          await saveConfig(this.hass!, urlPath, newConfig);
        } catch (err) {
          // eslint-disable-next-line
          console.error(err);
          // Rollback the optimistic update
          this._updateLovelace({
            config: previousConfig,
            mode: previousMode,
          });
          throw err;
        }
      },
      deleteConfig: async (): Promise<void> => {
        const { config: previousConfig, mode: previousMode } = this.lovelace!;
        try {
          // Optimistic update
          const localize = await this.hass!.loadBackendTranslation("title");
          this._updateLovelace({
            config: await generateLovelaceConfigFromHass(this.hass!, localize),
            mode: "generated",
            editMode: false,
          });
          this._ignoreNextUpdateEvent = true;
          await deleteConfig(this.hass!, urlPath);
        } catch (err) {
          // eslint-disable-next-line
          console.error(err);
          // Rollback the optimistic update
          this._updateLovelace({
            config: previousConfig,
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
  }
}

customElements.define("ha-panel-lovelace", LovelacePanel);
