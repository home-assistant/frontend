import "@material/mwc-list/mwc-list-item";
import "@material/mwc-select/mwc-select";
import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { slugify } from "../../../../common/string/slugify";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-switch";
import { LovelaceViewConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import "../../components/hui-theme-select-editor";
import {
  DEFAULT_VIEW_LAYOUT,
  PANEL_VIEW_LAYOUT,
  SIDEBAR_VIEW_LAYOUT,
} from "../../views/const";
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
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isNew!: boolean;

  @state() private _config!: LovelaceViewConfig;

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

  get _type(): string {
    if (!this._config) {
      return DEFAULT_VIEW_LAYOUT;
    }
    return this._config.panel
      ? PANEL_VIEW_LAYOUT
      : this._config.type || DEFAULT_VIEW_LAYOUT;
  }

  set config(config: LovelaceViewConfig) {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
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
        <ha-icon-picker
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.icon"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._icon}
          .placeholder=${this._icon}
          .configValue=${"icon"}
          @value-changed=${this._valueChanged}
        ></ha-icon-picker>
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
        <mwc-select
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.edit_view.type"
          )}
          .value=${this._type}
          @selected=${this._typeChanged}
          @closed=${stopPropagation}
          fixedMenuPosition
          naturalMenuWidth
        >
          ${[DEFAULT_VIEW_LAYOUT, SIDEBAR_VIEW_LAYOUT, PANEL_VIEW_LAYOUT].map(
            (type) => html`<mwc-list-item .value=${type}>
              ${this.hass.localize(
                `ui.panel.lovelace.editor.edit_view.types.${type}`
              )}
            </mwc-list-item>`
          )}
        </mwc-select>
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

  private _typeChanged(ev): void {
    const selected = ev.target.value;
    if (selected === "") {
      return;
    }
    const newConfig = {
      ...this._config,
    };
    delete newConfig.panel;
    if (selected === "masonry") {
      delete newConfig.type;
    } else {
      newConfig.type = selected;
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

    const config = {
      ...this._config,
      path: slugify(ev.currentTarget.value, "-"),
    };
    fireEvent(this, "view-config-changed", { config });
  }

  static get styles(): CSSResultGroup {
    return [
      configElementStyle,
      css`
        .panel {
          color: var(--secondary-text-color);
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-editor": HuiViewEditor;
  }
}
