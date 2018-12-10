import "@polymer/paper-button/paper-button";

import { fetchConfig, LovelaceConfig, saveConfig } from "../../data/lovelace";
import "../../layouts/hass-loading-screen";
import "../../layouts/hass-error-screen";
import "./hui-root";
import { HomeAssistant, PanelInfo } from "../../types";
import { Lovelace } from "./types";
import { LitElement, html, PropertyValues } from "@polymer/lit-element";
import { hassLocalizeLitMixin } from "../../mixins/lit-localize-mixin";
import { TemplateResult } from "lit-html";
import { showSaveDialog } from "./editor/show-save-config-dialog";

interface LovelacePanelConfig {
  mode: "yaml" | "storage";
}

class LovelacePanel extends hassLocalizeLitMixin(LitElement) {
  public panel?: PanelInfo<LovelacePanelConfig>;
  public hass?: HomeAssistant;
  public narrow?: boolean;
  public showMenu?: boolean;
  public route?: object;
  private _columns?: number;
  private _state?: "loading" | "loaded" | "error";
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

  public render(): TemplateResult {
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
            >Reload ui-lovelace.yaml</paper-button
          >
        </hass-error-screen>
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
    let conf;
    let gen: boolean;

    try {
      conf = await fetchConfig(this.hass!, force);
      gen = false;
    } catch (err) {
      if (err.code !== "config_not_found") {
        // tslint:disable-next-line
        console.log(err);
        this._state = "error";
        this._errorMsg = err.message;
        return;
      }
      const {
        generateLovelaceConfig,
      } = await import("./common/generate-lovelace-config");
      conf = generateLovelaceConfig(this.hass!, this.localize);
      gen = true;
    }

    this._state = "loaded";
    this.lovelace = {
      config: conf,
      autoGen: gen,
      editMode: this.lovelace ? this.lovelace.editMode : false,
      mode: this.panel!.config.mode,
      setEditMode: (editMode: boolean) => {
        if (!editMode || !this.lovelace!.autoGen) {
          this._updateLovelace({ editMode });
          return;
        }
        showSaveDialog(this, {
          lovelace: this.lovelace!,
        });
      },
      saveConfig: async (newConfig: LovelaceConfig): Promise<void> => {
        const { config, autoGen } = this.lovelace!;
        try {
          // Optimistic update
          this._updateLovelace({ config: newConfig, autoGen: false });
          await saveConfig(this.hass!, newConfig);
        } catch (err) {
          // tslint:disable-next-line
          console.error(err);
          // Rollback the optimistic update
          this._updateLovelace({ config, autoGen });
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
