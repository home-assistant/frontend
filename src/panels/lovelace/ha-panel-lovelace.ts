import "@polymer/paper-button/paper-button";

import { registerSaveDialog } from "./editor/hui-dialog-save-config";
import { fetchConfig } from "../../data/lovelace";
import "../../layouts/hass-loading-screen";
import "../../layouts/hass-error-screen";
import "./hui-root";
import { generateLovelace } from "./common/lovelace";
import { HomeAssistant } from "../../types";
import { Lovelace } from "./types";
import { LitElement, html, PropertyValues } from "@polymer/lit-element";
import { hassLocalizeLitMixin } from "../../mixins/lit-localize-mixin";
import { TemplateResult } from "lit-html";

let registeredDialog = false;

class LovelacePanel extends hassLocalizeLitMixin(LitElement) {
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
          .config="${this.lovelace!.config}"
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
    try {
      const conf = await fetchConfig(this.hass!, force);
      this.lovelace = generateLovelace(this.hass!, conf, false, false);
      this._state = "loaded";
    } catch (err) {
      if (err.code === "config_not_found") {
        const {
          generateLovelaceConfig,
        } = await import("./common/generate-lovelace-config");
        this.lovelace = generateLovelace(
          this.hass!,
          generateLovelaceConfig(this.hass!, this.localize),
          false,
          false
        );
        this._state = "loaded";

        if (!registeredDialog) {
          registeredDialog = true;
          registerSaveDialog(this);
        }
      } else {
        // tslint:disable-next-line
        console.log(err);
        this._state = "error";
        this._errorMsg = err.message;
      }
    }
  }
}

customElements.define("ha-panel-lovelace", LovelacePanel);
