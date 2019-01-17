import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import { EditorTarget } from "../types";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { configElementStyle } from "../config-elements/config-elements-style";

import "../../components/hui-theme-select-editor";
import { LovelaceViewConfig } from "../../../../data/lovelace";

declare global {
  interface HASSDomEvents {
    "view-config-changed": {
      config: LovelaceViewConfig;
    };
  }
}

export class HuiViewEditor extends hassLocalizeLitMixin(LitElement) {
  static get properties(): PropertyDeclarations {
    return { hass: {}, _config: {} };
  }

  get _path(): string {
    if (!this._config) {
      return "";
    }
    return this._config.path || "";
  }

  get _title(): string {
    if (!this._config) {
      return "";
    }
    return this._config.title || "";
  }

  get _icon(): string {
    if (!this._config) {
      return "";
    }
    return this._config.icon || "";
  }

  get _theme(): string {
    if (!this._config) {
      return "";
    }
    return this._config.theme || "Backend-selected";
  }

  public hass?: HomeAssistant;
  private _config?: LovelaceViewConfig;

  set config(config: LovelaceViewConfig) {
    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <paper-input
          label="Title"
          .value="${this._title}"
          .configValue="${"title"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <paper-input
          label="Icon"
          .value="${this._icon}"
          .configValue="${"icon"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <paper-input
          label="URL Path"
          .value="${this._path}"
          .configValue="${"path"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <hui-theme-select-editor
          .hass="${this.hass}"
          .value="${this._theme}"
          .configValue="${"theme"}"
          @theme-changed="${this._valueChanged}"
        ></hui-theme-select-editor>
      </div>
    `;
  }

  private _valueChanged(ev: Event): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.currentTarget! as EditorTarget;

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }

    let newConfig;

    if (target.configValue) {
      newConfig = {
        ...this._config,
        [target.configValue]: target.value,
      };
    }

    fireEvent(this, "view-config-changed", { config: newConfig });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-editor": HuiViewEditor;
  }
}

customElements.define("hui-view-editor", HuiViewEditor);
