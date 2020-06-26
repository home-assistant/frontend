import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import { slugify } from "../../../../common/string/slugify";
import "../../../../components/ha-switch";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-input";
import { LovelaceViewConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import "../../components/hui-theme-select-editor";
import { configElementStyle } from "../config-elements/config-elements-style";
import { EditorTarget } from "../types";

declare global {
  interface HASSDomEvents {
    "view-config-changed": {
      config: LovelaceViewConfig;
    };
  }
}

@customElement("hui-view-editor")
export class HuiViewEditor extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public isNew!: boolean;

  @property() private _config!: LovelaceViewConfig;

  private _suggestedPath = false;

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

  get _panel(): boolean {
    if (!this._config) {
      return false;
    }
    return this._config.panel || false;
  }

  set config(config: LovelaceViewConfig) {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.title"
          )}  (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._title}
          .configValue=${"title"}
          @value-changed=${this._valueChanged}
          @blur=${this._handleTitleBlur}
        ></paper-input>
        <ha-icon-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.icon"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._icon}
          .placeholder=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
        ></ha-icon-input>
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.url"
          )}  (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._path}
          .configValue=${"path"}
          @value-changed=${this._valueChanged}
        ></paper-input>
        <hui-theme-select-editor
          .hass=${this.hass}
          .value=${this._theme}
          .configValue=${"theme"}
          @value-changed=${this._valueChanged}
        ></hui-theme-select-editor>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.view.panel_mode.title"
          )}
        >
          <ha-switch
            .checked=${this._panel !== false}
            .configValue=${"panel"}
            @change=${this._valueChanged}
          ></ha-switch
        ></ha-formfield>
        <span class="panel">
          ${this.hass.localize(
            "ui.panel.lovelace.editor.view.panel_mode.description"
          )}
        </span>
      </div>
    `;
  }

  private _valueChanged(ev: Event): void {
    const target = ev.currentTarget! as EditorTarget;

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }

    let newConfig;

    if (target.configValue) {
      newConfig = {
        ...this._config,
        [target.configValue!]:
          target.checked !== undefined ? target.checked : target.value,
      };
    }

    fireEvent(this, "view-config-changed", { config: newConfig });
  }

  private _handleTitleBlur(ev) {
    if (
      !this.isNew ||
      this._suggestedPath ||
      this._config.path ||
      !ev.currentTarget.value
    ) {
      return;
    }

    const config = { ...this._config, path: slugify(ev.currentTarget.value) };
    fireEvent(this, "view-config-changed", { config });
  }

  static get styles(): CSSResult {
    return css`
      .panel {
        color: var(--secondary-text-color);
      }
      ha-formfield {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-editor": HuiViewEditor;
  }
}
