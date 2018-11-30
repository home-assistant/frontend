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
import { addCard, LovelaceCardConfig } from "../../../data/lovelace";
import { fireEvent } from "../../../common/dom/fire_event";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";

import "./hui-yaml-editor";
import "./hui-card-preview";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiCardPreview } from "./hui-card-preview";
import { YamlChangedEvent, ConfigValue, ConfigError } from "./types";
import { extYamlSchema } from "./yaml-ext-schema";

declare global {
  interface HASSDomEvents {
    "yaml-changed": {
      yaml: string;
    };
  }
}

const CUSTOM_TYPE_PREFIX = "custom:";

export class HuiAddCard extends hassLocalizeLitMixin(LitElement) {
  static get properties(): PropertyDeclarations {
    return {
      _hass: {},
      viewId: {},
      _configValue: {},
      _configState: {},
      _saving: {},
      _loading: {},
    };
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  private get _previewEl(): HuiCardPreview {
    return this.shadowRoot!.querySelector("hui-card-preview")!;
  }
  public viewId?: string;
  protected hass?: HomeAssistant;
  private _configValue?: ConfigValue;
  private _configState?: string;
  private _loading?: boolean;
  private _saving: boolean;

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
          <hui-yaml-editor
            .hass="${this.hass}"
            .yaml=""
            @yaml-changed="${this._handleYamlChanged}"
          ></hui-yaml-editor>
          <hr />
          <hui-card-preview .hass="${this.hass}"></hui-card-preview>
        </paper-dialog-scrollable>
        ${
          !this._loading
            ? html`
                <div class="paper-dialog-buttons">
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
    this.viewId = undefined;
    this._dialog.close();
  }

  private async _updateConfigInBackend(): Promise<void> {
    if (!this._isConfigValid()) {
      alert("Your config is not valid, please fix your config before saving.");
      this._saveDone();
      return;
    }

    try {
      await addCard(
        this.hass!,
        this.viewId!,
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
    } catch (err) {
      this._configState = "YAML_ERROR";
      this._setPreviewError({
        type: "YAML Error",
        message: err,
      });
    }
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
    if (!this.viewId || !this._configValue || !this._configValue.value) {
      return false;
    }
    if (this._configState === "OK") {
      return true;
    } else {
      return false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-add-card": HuiAddCard;
  }
}

customElements.define("hui-add-card", HuiAddCard);
