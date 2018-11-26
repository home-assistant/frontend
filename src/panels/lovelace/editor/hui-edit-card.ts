import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { classMap } from "lit-html/directives/classMap";
import { TemplateResult } from "lit-html";
import yaml from "js-yaml";

import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-dialog/paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import { HomeAssistant } from "../../../types";
import { updateCardConfig } from "../common/data";
import { fireEvent } from "../../../common/dom/fire_event";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";

import "./hui-yaml-editor";
import "./hui-card-preview";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiCardPreview } from "./hui-card-preview";
import { LovelaceCardEditor, LovelaceCardConfig } from "../types";
import { YamlChangedEvent, ConfigValue, ConfigError } from "./types";
import { extYamlSchema } from "./yaml-ext-schema";
import { EntityConfig } from "../entity-rows/types";

declare global {
  interface HASSDomEvents {
    "yaml-changed": {
      yaml: string;
    };
    "entities-changed": {
      entities: EntityConfig[];
    };
    "config-changed": {
      config: LovelaceCardConfig;
    };
  }
}

const CUSTOM_TYPE_PREFIX = "custom:";

export class HuiEditCard extends hassLocalizeLitMixin(LitElement) {
  protected hass?: HomeAssistant;
  private _cardId?: string;
  private _originalConfig?: LovelaceCardConfig;
  private _configElement?: LovelaceCardEditor | null;
  private _uiEditor?: boolean;
  private _configValue?: ConfigValue;
  private _configState?: string;
  private _loading?: boolean;
  private _isToggleAvailable?: boolean;
  private _saving: boolean;

  static get properties(): PropertyDeclarations {
    return {
      _hass: {},
      _cardId: {},
      _originalConfig: {},
      _configElement: {},
      _configValue: {},
      _configState: {},
      _uiEditor: {},
      _saving: {},
      _loading: {},
      _isToggleAvailable: {},
    };
  }

  protected constructor() {
    super();
    this._saving = false;
  }

  set cardConfig(cardConfig: LovelaceCardConfig) {
    this._originalConfig = cardConfig;
    if (String(cardConfig.id) !== this._cardId) {
      this._loading = true;
      this._uiEditor = true;
      this._configElement = undefined;
      this._configValue = { format: "yaml", value: undefined };
      this._configState = "OK";
      this._isToggleAvailable = false;
      this._cardId = String(cardConfig.id);
      this._loadConfigElement();
    }
  }

  public async showDialog(): Promise<void> {
    // Wait till dialog is rendered.
    if (this._dialog == null) {
      await this.updateComplete;
    }
    this._dialog.open();
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  private get _previewEl(): HuiCardPreview {
    return this.shadowRoot!.querySelector("hui-card-preview")!;
  }

  protected render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      <paper-dialog with-backdrop>
        <h2>${this.localize("ui.panel.lovelace.editor.edit.header")}</h2>
        <paper-spinner
          ?active="${this._loading}"
          alt="Loading"
          class="center margin-bot"
        ></paper-spinner>
        <paper-dialog-scrollable
          class="${classMap({ hidden: this._loading! })}"
        >
          ${
            this._uiEditor && this._configElement !== null
              ? html`
                  <div class="element-editor">${this._configElement}</div>
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
          <hr />
          <hui-card-preview .hass="${this.hass}"></hui-card-preview>
        </paper-dialog-scrollable>
        ${
          !this._loading
            ? html`
                <div class="paper-dialog-buttons">
                  <paper-button
                    ?disabled="${!this._isToggleAvailable}"
                    @click="${this._toggleEditor}"
                    >${
                      this.localize(
                        "ui.panel.lovelace.editor.edit.toggle_editor"
                      )
                    }</paper-button
                  >
                  <paper-button @click="${this._closeDialog}"
                    >${this.localize("ui.common.cancel")}</paper-button
                  >
                  <paper-button
                    ?disabled="${this._saving}"
                    @click="${this._save}"
                  >
                    <paper-spinner
                      ?active="${this._saving}"
                      alt="Saving"
                    ></paper-spinner>
                    ${
                      this.localize("ui.panel.lovelace.editor.edit.save")
                    }</paper-button
                  >
                </div>
              `
            : html``
        }
      </paper-dialog>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        paper-dialog {
          width: 650px;
        }
        .center {
          margin-left: auto;
          margin-right: auto;
        }
        .margin-bot {
          margin-bottom: 24px;
        }
        paper-button paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
        paper-spinner {
          display: none;
        }
        paper-spinner[active] {
          display: block;
        }
        .hidden {
          display: none;
        }
        .element-editor {
          margin-bottom: 8px;
        }
        hr {
          color: #000;
          opacity: 0.12;
        }
        hui-card-preview {
          padding-top: 8px;
          display: block;
        }
      </style>
    `;
  }

  private _toggleEditor(): void {
    if (!this._isToggleAvailable) {
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
        this._configValue = { format: "yaml", value: undefined };
      }
      this._uiEditor = !this._uiEditor;
    } else if (this._configElement && this._configValue!.format === "yaml") {
      this._configValue = {
        format: "json",
        value: yaml.safeLoad(this._configValue!.value, {
          schema: extYamlSchema,
        }),
      };
      this._configElement.setConfig(this._configValue!
        .value as LovelaceCardConfig);
      this._uiEditor = !this._uiEditor;
    }
    this._resizeDialog();
  }

  private _save(): void {
    this._saving = true;
    this._updateConfigInBackend();
  }

  private _saveDone(): void {
    this._saving = false;
  }

  private async _loadedDialog(): Promise<void> {
    await this.updateComplete;
    this._loading = false;
    this._resizeDialog();
  }

  private async _resizeDialog(): Promise<void> {
    await this.updateComplete;
    fireEvent(this._dialog, "iron-resize");
  }

  private _closeDialog(): void {
    this._dialog.close();
  }

  private async _updateConfigInBackend(): Promise<void> {
    if (!this._isConfigValid()) {
      alert("Your config is not valid, please fix your config before saving.");
      this._saveDone();
      return;
    }

    if (!this._isConfigChanged()) {
      this._closeDialog();
      this._saveDone();
      return;
    }

    try {
      await updateCardConfig(
        this.hass!,
        this._cardId!,
        this._configValue!.value!,
        this._configValue!.format
      );
      this._closeDialog();
      this._saveDone();
      fireEvent(this, "reload-lovelace");
    } catch (err) {
      alert(`Saving failed: ${err.message}`);
      this._saveDone();
    }
  }

  private _handleYamlChanged(ev: YamlChangedEvent): void {
    this._configValue = { format: "yaml", value: ev.detail.yaml };
    try {
      const config = yaml.safeLoad(this._configValue.value, {
        schema: extYamlSchema,
      }) as LovelaceCardConfig;
      this._updatePreview(config);
      this._configState = "OK";
      if (!this._isToggleAvailable && this._configElement !== null) {
        this._isToggleAvailable = true;
      }
    } catch (err) {
      this._isToggleAvailable = false;
      this._configState = "YAML_ERROR";
      this._setPreviewError({
        type: "YAML Error",
        message: err,
      });
    }
  }

  private _handleUIConfigChanged(value: LovelaceCardConfig): void {
    this._configValue = { format: "json", value };
    this._updatePreview(value);
  }

  private _updatePreview(config: LovelaceCardConfig) {
    if (!this._previewEl) {
      return;
    }

    this._previewEl.config = config;

    if (this._loading) {
      this._loadedDialog();
    } else {
      this._resizeDialog();
    }
  }

  private _setPreviewError(error: ConfigError) {
    if (!this._previewEl) {
      return;
    }
    this._previewEl.error = error;

    this._resizeDialog();
  }

  private _isConfigValid() {
    if (!this._cardId || !this._configValue || !this._configValue.value) {
      return false;
    }
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
    return JSON.stringify(configValue) !== JSON.stringify(this._originalConfig);
  }

  private async _loadConfigElement(): Promise<void> {
    if (!this._originalConfig) {
      return;
    }
    const conf = this._originalConfig;
    const tag = conf.type.startsWith(CUSTOM_TYPE_PREFIX)
      ? conf!.type.substr(CUSTOM_TYPE_PREFIX.length)
      : `hui-${conf!.type}-card`;

    const elClass = customElements.get(tag);
    let configElement;

    try {
      configElement = await elClass.getConfigElement();
    } catch (err) {
      this._configElement = null;
      this._uiEditor = false;
      return;
    }

    this._isToggleAvailable = true;

    configElement.setConfig(conf);
    configElement.hass = this.hass;
    configElement.addEventListener("config-changed", (ev) =>
      this._handleUIConfigChanged(ev.detail.config)
    );
    this._configValue = { format: "json", value: conf };
    this._configElement = configElement;
    this._updatePreview(conf);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-edit-card": HuiEditCard;
  }
}

customElements.define("hui-edit-card", HuiEditCard);
