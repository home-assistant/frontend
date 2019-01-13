import "@polymer/paper-button/paper-button";

import { fetchConfig, LovelaceConfig, saveConfig } from "../../data/lovelace";
import "../../layouts/hass-loading-screen";
import "../../layouts/hass-error-screen";
import "./hui-root";
import { HomeAssistant, PanelInfo } from "../../types";
import { Lovelace } from "./types";
import { LitElement, html, PropertyValues, TemplateResult } from "lit-element";
import { hassLocalizeLitMixin } from "../../mixins/lit-localize-mixin";
import { showSaveDialog } from "./editor/show-save-config-dialog";
import { generateLovelaceConfig } from "./common/generate-lovelace-config";

interface LovelacePanelConfig {
  mode: "yaml" | "storage";
}

let editorLoaded = false;

class LovelacePanel extends hassLocalizeLitMixin(LitElement) {
  public panel?: PanelInfo<LovelacePanelConfig>;
  public hass?: HomeAssistant;
  public narrow?: boolean;
  public showMenu?: boolean;
  public route?: object;
  private _columns?: number;
  private _state?: "loading" | "loaded" | "error" | "yaml-editor";
  private _errorMsg?: string;
  private lovelace?: Lovelace;
  private mqls?: MediaQueryList[];

  static get properties() {
    return {
      hass: {},
      lovelace: {},
      narrow: { type: Boolean, value: false },
      showMenu: { type: Boolean, value: false },
      route: {},
      _columns: { type: Number, value: 1 },
      _state: { type: String, value: "loading" },
      _errorMsg: String,
      _config: { type: {}, value: null },
    };
  }

  constructor() {
    super();
    this._closeEditor = this._closeEditor.bind(this);
  }

  public render(): TemplateResult | void {
    const state = this._state!;

    if (state === "loaded") {
      return html`
        <hui-root
          .narrow="${this.narrow}"
          .showMenu="${this.showMenu}"
          .hass="${this.hass}"
          .lovelace="${this.lovelace}"
          .route="${this.route}"
          .columns="${this._columns}"
          @config-refresh="${this._forceFetchConfig}"
        ></hui-root>
      `;
    }

    if (state === "error") {
      return html`
        <style>
          paper-button {
            color: var(--primary-color);
            font-weight: 500;
          }
        </style>
        <hass-error-screen
          title="Lovelace"
          .error="${this._errorMsg}"
          .narrow="${this.narrow}"
          .showMenu="${this.showMenu}"
        >
          <paper-button on-click="_forceFetchConfig"
            >Reload Lovelace</paper-button
          >
        </hass-error-screen>
      `;
    }

    if (state === "yaml-editor") {
      return html`
        <hui-editor
          .lovelace="${this.lovelace}"
          .closeEditor="${this._closeEditor}"
        ></hui-editor>
      `;
    }

    return html`
      <hass-loading-screen
        .narrow="${this.narrow}"
        .showMenu="${this.showMenu}"
      ></hass-loading-screen>
    `;
  }

  public updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("narrow") || changedProps.has("showMenu")) {
      this._updateColumns();
    }
  }

  public firstUpdated() {
    this._fetchConfig(false);
    this._updateColumns = this._updateColumns.bind(this);
    this.mqls = [300, 600, 900, 1200].map((width) => {
      const mql = matchMedia(`(min-width: ${width}px)`);
      mql.addListener(this._updateColumns);
      return mql;
    });
    this._updateColumns();
  }

  private _closeEditor() {
    this._state = "loaded";
  }

  private _updateColumns() {
    const matchColumns = this.mqls!.reduce(
      (cols, mql) => cols + Number(mql.matches),
      0
    );
    // Do -1 column if the menu is docked and open
    this._columns = Math.max(
      1,
      matchColumns - Number(!this.narrow && this.showMenu)
    );
  }

  private _forceFetchConfig() {
    this._fetchConfig(true);
  }

  private async _fetchConfig(force) {
    let conf: LovelaceConfig;
    let confMode: Lovelace["mode"] = this.panel!.config.mode;

    try {
      conf = await fetchConfig(this.hass!, force);
    } catch (err) {
      if (err.code !== "config_not_found") {
        // tslint:disable-next-line
        console.log(err);
        this._state = "error";
        this._errorMsg = err.message;
        return;
      }
      conf = generateLovelaceConfig(this.hass!, this.localize);
      confMode = "generated";
    }

    this._state = "loaded";
    this.lovelace = {
      config: conf,
      editMode: this.lovelace ? this.lovelace.editMode : false,
      mode: confMode,
      enableFullEditMode: () => {
        if (!editorLoaded) {
          editorLoaded = true;
          import(/* webpackChunkName: "lovelace-yaml-editor" */ "./hui-editor");
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
        });
      },
      saveConfig: async (newConfig: LovelaceConfig): Promise<void> => {
        const { config, mode } = this.lovelace!;
        try {
          // Optimistic update
          this._updateLovelace({ config: newConfig, mode: "storage" });
          await saveConfig(this.hass!, newConfig);
        } catch (err) {
          // tslint:disable-next-line
          console.error(err);
          // Rollback the optimistic update
          this._updateLovelace({ config, mode });
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
