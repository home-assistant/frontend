import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { when } from "lit-html/directives/when";
import { TemplateResult } from "lit-html";
import yaml from "js-yaml";

import "@polymer/paper-button/paper-button";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import { HomeAssistant } from "../../../types";
import { updateCardConfig } from "../common/data";
import { fireEvent } from "../../../common/dom/fire_event";

import "./hui-yaml-editor";
import "./hui-card-preview";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiCardPreview } from "./hui-card-preview";
import { LovelaceCardEditor, LovelaceConfig } from "../types";
import { YamlChangedEvent, ConfigValue, ConfigError } from "./types";
import { extYamlSchema } from "./yaml-ext-schema";

const CUSTOM_TYPE_PREFIX = "custom:";

export class HuiEditCard extends LitElement {
  protected hass?: HomeAssistant;
  private _cardId?: string;
  private _originalConfig?: LovelaceConfig;
  private _configElement?: LovelaceCardEditor | null;
  private _uiEditor?: boolean;
  private _configValue?: ConfigValue;
  private _configState?: string;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _cardId: {},
      _originalConfig: {},
      _configElement: {},
      _configValue: {},
      _configState: {},
      _uiEditor: {},
    };
  }

  set cardConfig(cardConfig: LovelaceConfig) {
    this._originalConfig = cardConfig;
    if (String(cardConfig.id) !== this._cardId) {
      this._uiEditor = true;
      this._configElement = undefined;
      this._configValue = { format: "yaml", value: "" };
      this._configState = "OK";
      this._cardId = String(cardConfig.id);
      this._loadConfigElement();
    }
  }

  public toggleEditor(): void {
    if (!this._isToggleAvailable()) {
      alert("You can't switch editor.");
      return;
    }
    if (this._uiEditor && this._configValue!.format === "json") {
      if (this._isConfigChanged()) {
        this._configValue = {
          format: "yaml",
          value: yaml.safeDump(this._configValue!.value),
        };
      } else {
        this._configValue = { format: "yaml", value: "" };
      }
      this._uiEditor = !this._uiEditor;
    } else if (this._configElement && this._configValue!.format === "yaml") {
      this._configValue = {
        format: "json",
        value: yaml.safeLoad(this._configValue!.value, {
          schema: extYamlSchema,
        }),
      };
      this._configElement.setConfig(this._configValue!.value as LovelaceConfig);
      this._uiEditor = !this._uiEditor;
    }
  }

  public async updateConfigInBackend(): Promise<void> {
    if (!this._isConfigChanged()) {
      fireEvent(this, "close-dialog");
      return;
    }

    if (!this._isConfigValid()) {
      alert("Your config is not valid, please fix your config before saving.");
      return;
    }

    try {
      await updateCardConfig(
        this.hass!,
        this._cardId!,
        this._configValue!.value,
        this._configValue!.format
      );
      fireEvent(this, "reload-lovelace");
      fireEvent(this, "close-dialog");
    } catch (err) {
      alert(`Saving failed: ${err.message}`);
    }
  }

  private get _previewEl(): HuiCardPreview {
    return this.shadowRoot!.querySelector("hui-card-preview")!;
  }

  protected render(): TemplateResult {
    return html`
      <style>
        .element-editor {
          margin-bottom: 16px;
        }
      </style>
      ${
        this._uiEditor && this._configElement !== null
          ? html`
              <div class="element-editor">
                ${
                  when(
                    this._configElement,
                    () => this._configElement,
                    () => html`
                      Loading...
                    `
                  )
                }
              </div>
            `
          : html`
              <hui-yaml-editor
                .hass="${this.hass}"
                .cardId="${this._cardId}"
                .yaml="${this._configValue!.value}"
                @yaml-changed="${this._handleYamlChanged}"
              ></hui-yaml-editor>
            `
      }
      <hui-card-preview .hass="${this.hass}"></hui-card-preview>
    `;
  }

  private _handleYamlChanged(ev: YamlChangedEvent): void {
    this._configValue = { format: "yaml", value: ev.detail.yaml };
    try {
      const config = yaml.safeLoad(this._configValue.value, {
        schema: extYamlSchema,
      }) as LovelaceConfig;
      this._updatePreview(config);
      this._configState = "OK";
    } catch (err) {
      this._configState = "YAML_ERROR";
      this._setPreviewError({
        type: "YAML Error",
        message: err,
      });
    }
  }

  private _handleUIConfigChanged(value: LovelaceConfig): void {
    this._configElement!.setConfig(value);
    this._configValue = { format: "json", value };
    this._updatePreview(value);
  }

  private _updatePreview(value: LovelaceConfig) {
    if (!this._previewEl) {
      return;
    }
    this._previewEl.value = value;

    fireEvent(this, "resize-dialog");
  }

  private _setPreviewError(error: ConfigError) {
    if (!this._previewEl) {
      return;
    }
    this._previewEl.error = error;

    fireEvent(this, "resize-dialog");
  }

  private _isConfigValid() {
    if (this._configState === "OK") {
      return true;
    } else {
      return false;
    }
  }

  private _isConfigChanged(): boolean {
    const configValue =
      this._configValue!.format === "yaml"
        ? yaml.safeDump(this._configValue!.value)
        : this._configValue!.value;
    if (JSON.stringify(configValue) === JSON.stringify(this._originalConfig)) {
      return false;
    } else {
      return true;
    }
  }

  private _isToggleAvailable(): boolean {
    if (this._configElement !== null && this._isConfigValid()) {
      return true;
    } else {
      return false;
    }
  }

  private async _loadConfigElement(): Promise<void> {
    const conf = this._originalConfig;
    const tag = conf!.type.startsWith(CUSTOM_TYPE_PREFIX)
      ? conf!.type.substr(CUSTOM_TYPE_PREFIX.length)
      : `hui-${conf!.type}-card`;

    const elClass = customElements.get(tag);
    let configElement;

    try {
      configElement = await elClass.getConfigElement();
    } catch (err) {
      this._configElement = null;
      return;
    }

    configElement.setConfig(conf);
    configElement.hass = this.hass;
    configElement.addEventListener("config-changed", (ev) =>
      this._handleUIConfigChanged(ev.detail.config)
    );
    this._configValue = { format: "json", value: conf! };
    this._configElement = configElement;

    // This will center the dialog with the updated config Element
    fireEvent(this, "resize-dialog");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-edit-card": HuiEditCard;
  }
}

customElements.define("hui-edit-card", HuiEditCard);
