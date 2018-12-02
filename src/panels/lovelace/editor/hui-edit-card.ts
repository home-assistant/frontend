import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
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
import {
  addCard,
  updateCardConfig,
  LovelaceCardConfig,
} from "../../../data/lovelace";
import { fireEvent } from "../../../common/dom/fire_event";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";

import "./hui-yaml-editor";
import "./hui-card-picker";
import "./hui-card-preview";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiCardPreview } from "./hui-card-preview";
import { LovelaceCardEditor } from "../types";
import {
  YamlChangedEvent,
  CardPickedEvent,
  ConfigValue,
  ConfigError,
} from "./types";
import { extYamlSchema } from "./yaml-ext-schema";
import { EntityConfig } from "../entity-rows/types";
import { getCardElementTag } from "../common/get-card-element-tag";

declare global {
  interface HASSDomEvents {
    "card-picked": {
      config: LovelaceCardConfig;
    };
    "yaml-changed": {
      yaml: string;
    };
    "entities-changed": {
      entities: EntityConfig[];
    };
    "config-changed": {
      config: LovelaceCardConfig;
    };
    "cancel-edit-card": {};
  }
}

export class HuiEditCard extends hassLocalizeLitMixin(LitElement) {
  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cardConfig: {},
      viewId: {},
      _cardId: {},
      _configElement: {},
      _configValue: {},
      _configState: {},
      _errorMsg: {},
      _uiEditor: {},
      _saving: {},
      _loading: {},
      _isToggleAvailable: {},
      _isSavingAvailable: {},
    };
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  private get _previewEl(): HuiCardPreview {
    return this.shadowRoot!.querySelector("hui-card-preview")!;
  }
  public cardConfig?: LovelaceCardConfig;
  public viewId?: string | number;
  protected hass?: HomeAssistant;
  private _cardId?: string;
  private _configElement?: LovelaceCardEditor | null;
  private _uiEditor?: boolean;
  private _configValue?: ConfigValue;
  private _configState?: string;
  private _loading?: boolean;
  private _isToggleAvailable?: boolean;
  private _isSavingAvailable?: boolean;
  private _saving: boolean;
  private _errorMsg?: TemplateResult;
  private _cardType?: string;

  protected constructor() {
    super();
    this._saving = false;
  }

  public async showDialog(): Promise<void> {
    // Wait till dialog is rendered.
    if (this._dialog == null) {
      await this.updateComplete;
    }
    this._dialog.open();
  }

  protected async updated(changedProperties: PropertyValues): Promise<void> {
    super.updated(changedProperties);
    if (
      !changedProperties.has("cardConfig") &&
      !changedProperties.has("viewId")
    ) {
      return;
    }

    this._configValue = { format: "yaml", value: undefined };
    this._configState = "OK";
    this._uiEditor = true;
    this._errorMsg = undefined;
    this._configElement = undefined;
    this._isToggleAvailable = false;

    if (this.cardConfig && String(this.cardConfig.id) !== this._cardId) {
      this._loading = true;
      this._cardId = String(this.cardConfig.id);
      this._isSavingAvailable = true;
      this._loadConfigElement(this.cardConfig);
    } else {
      this._cardId = undefined;
    }

    if (this.viewId && !this.cardConfig) {
      this._isSavingAvailable = false;
      this._resizeDialog();
    }
  }

  protected render(): TemplateResult {
    let content;
    let preview;
    if (this._configElement !== undefined) {
      if (this._uiEditor) {
        content = html`
          <div class="element-editor">${this._configElement}</div>
        `;
      } else {
        content = html`
          <hui-yaml-editor
            .hass="${this.hass}"
            .cardId="${this._cardId}"
            .yaml="${this._configValue!.value}"
            @yaml-changed="${this._handleYamlChanged}"
          ></hui-yaml-editor>
        `;
      }
      preview = html`
        <hr />
        <hui-card-preview .hass="${this.hass}"> </hui-card-preview>
      `;
    } else if (this.viewId && !this.cardConfig) {
      content = html`
        <hui-card-picker
          .hass="${this.hass}"
          @card-picked="${this._handleCardPicked}"
        ></hui-card-picker>
      `;
    }

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
            this._errorMsg
              ? html`
                  <div class="error">${this._errorMsg}</div>
                `
              : ""
          }
          ${content} ${preview}
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
                    ?disabled="${this._saving || !this._isSavingAvailable}"
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
            : ""
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
        .error {
          color: #ef5350;
          border-bottom: 1px solid #ef5350;
        }
        hr {
          color: #000;
          opacity: 0.12;
        }
        hui-card-preview {
          padding-top: 8px;
          margin-bottom: 4px;
          display: block;
        }
      </style>
    `;
  }

  private async _toggleEditor(): Promise<void> {
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
      this._uiEditor = !this._uiEditor;
      const cardConfig = this._configValue!.value! as LovelaceCardConfig;
      if (cardConfig.type !== this._cardType) {
        await this._loadConfigElement(cardConfig);
        this._cardType = cardConfig.type;
      }
      this._configElement.setConfig(cardConfig);
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
    this.cardConfig = undefined;
    this.viewId = undefined;
    fireEvent(this, "cancel-edit-card");
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
      if (this.viewId) {
        await addCard(
          this.hass!,
          String(this.viewId),
          this._configValue!.value!,
          this._configValue!.format
        );
      } else {
        await updateCardConfig(
          this.hass!,
          this._cardId!,
          this._configValue!.value!,
          this._configValue!.format
        );
      }
      this._closeDialog();
      this._saveDone();
      fireEvent(this, "reload-lovelace");
    } catch (err) {
      alert(`Saving failed: ${err.message}`);
      this._saveDone();
    }
  }

  private async _handleCardPicked(ev: CardPickedEvent): Promise<void> {
    this._isSavingAvailable = true;
    const succes = await this._loadConfigElement(ev.detail.config);
    if (!succes) {
      this._configValue = {
        format: "yaml",
        value: yaml.safeDump(ev.detail.config),
      };
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
      this._isSavingAvailable = true;
    } catch (err) {
      this._isToggleAvailable = false;
      this._isSavingAvailable = false;
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
    if (!this._configValue || !this._configValue.value) {
      return false;
    }
    if (this._configState === "OK") {
      return true;
    } else {
      return false;
    }
  }

  private _isConfigChanged(): boolean {
    if (this.viewId) {
      return true;
    }
    const configValue =
      this._configValue!.format === "yaml"
        ? yaml.safeDump(this._configValue!.value)
        : this._configValue!.value;
    return JSON.stringify(configValue) !== JSON.stringify(this.cardConfig);
  }

  private async _loadConfigElement(conf: LovelaceCardConfig): Promise<boolean> {
    if (!conf) {
      return false;
    }

    this._errorMsg = undefined;
    this._loading = true;
    this._configElement = undefined;
    this._isToggleAvailable = false;

    const tag = getCardElementTag(conf.type);

    const elClass = customElements.get(tag);
    let configElement;

    try {
      configElement = await elClass.getConfigElement();
    } catch (err) {
      this._uiEditor = false;
      this._configElement = null;
      return false;
    }

    try {
      configElement.setConfig(conf);
    } catch (err) {
      this._errorMsg = html`
        Your config is not supported by the UI editor:<br /><b>${err.message}</b
        ><br />Falling back to YAML editor.
      `;
      this._uiEditor = false;
      this._configElement = null;
      return false;
    }

    configElement.hass = this.hass;
    configElement.addEventListener("config-changed", (ev) =>
      this._handleUIConfigChanged(ev.detail.config)
    );
    this._configValue = { format: "json", value: conf };
    this._configElement = configElement;
    this._isToggleAvailable = true;
    await this.updateComplete;
    this._updatePreview(conf);
    return true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-edit-card": HuiEditCard;
  }
}

customElements.define("hui-edit-card", HuiEditCard);
