import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import yaml from "js-yaml";
import { when } from "lit-html/directives/when";
import { TemplateResult } from "lit-html";

import "@polymer/paper-button/paper-button";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-dialog/paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import { HomeAssistant } from "../../../types";
import { getCardConfig, updateCardConfig } from "../common/data";
import { fireEvent } from "../../../common/dom/fire_event";

import "./hui-yaml-editor";
import "./hui-yaml-card-preview";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiYAMLCardPreview } from "./hui-yaml-card-preview";
import { LovelaceCardEditor, LovelaceConfig } from "../types";
import { YamlChangedEvent } from "./types";

const CUSTOM_TYPE_PREFIX = "custom:";

export class HuiDialogEditCard extends LitElement {
  protected hass?: HomeAssistant;
  private _cardId?: string;
  private _currentConfigYaml?: string;
  private _originalConfigYaml?: string;
  private _elementConfig?: LovelaceCardEditor | null;
  private _reloadLovelace?: () => void;
  private _editorToggle?: boolean;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cardId: {
        type: Number,
      },
      _currentConfigYaml: {},
      _dialogClosedCallback: {},
      _elementConfig: {},
      _editorToggle: {},
    };
  }

  public async showDialog({ hass, cardId, reloadLovelace }) {
    this.hass = hass;
    this._cardId = cardId;
    this._reloadLovelace = reloadLovelace;
    this._currentConfigYaml = "";
    this._editorToggle = true;
    this._elementConfig = undefined;
    this._loadConfig().then(() => this._loadConfigElement());
    this._originalConfigYaml = this._currentConfigYaml;
    // Wait till dialog is rendered.
    await this.updateComplete;
    this._dialog.open();
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  private get _previewEl(): HuiYAMLCardPreview {
    return this.shadowRoot!.querySelector("hui-yaml-card-preview")!;
  }

  protected render(): TemplateResult {
    return html`
      <style>
        paper-dialog {
          width: 650px;
        }
        .element-editor {
          margin-bottom: 16px;
        }
      </style>
      <paper-dialog with-backdrop>
        <h2>Card Configuration</h2>
        <paper-dialog-scrollable>
          ${
            this._editorToggle && this._elementConfig !== null
              ? html`<div class="element-editor">${when(
                  this._elementConfig,
                  () => this._elementConfig,
                  () => html`Loading...`
                )}</div>`
              : html`
              <hui-yaml-editor
                .yaml="${this._currentConfigYaml}"
                @yaml-changed="${this._handleYamlChanged}"
              ></hui-yaml-editor>`
          }
          <hui-yaml-card-preview
            .hass="${this.hass}"
            .yaml="${this._currentConfigYaml}"
          ></hui-yaml-card-preview>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <paper-button
            @click="${this._toggleEditor}"
          >Toggle Editor</paper-button>
          <paper-button
            @click="${this._closeDialog}"
          >Cancel</paper-button>
          <paper-button
            @click="${this._updateConfig}"'
          >Save</paper-button>
        </div>
      </paper-dialog>
    `;
  }

  private _handleYamlChanged(ev: YamlChangedEvent): void {
    this._updatePreview(ev.detail.yaml);
  }

  private _handleConfigChanged(value: LovelaceConfig): void {
    this._currentConfigYaml = yaml.safeDump(value);
    this._updatePreview(this._currentConfigYaml!);
  }

  private _updatePreview(value: string) {
    if (!this._previewEl) {
      return;
    }
    if (this._elementConfig) {
      this._elementConfig.setConfig(yaml.safeLoad(value));
    }
    this._previewEl.yaml = value;
  }

  private _closeDialog(): void {
    this._dialog.close();
  }

  private _toggleEditor(): void {
    this._editorToggle = !this._editorToggle;
  }

  private async _loadConfig(): Promise<void> {
    this._currentConfigYaml = await getCardConfig(this.hass!, this._cardId!);
  }

  private async _loadConfigElement(): Promise<void> {
    const conf = yaml.safeLoad(this._currentConfigYaml);
    const tag = conf.type.startsWith(CUSTOM_TYPE_PREFIX)
      ? conf.type.substr(CUSTOM_TYPE_PREFIX.length)
      : `hui-${conf.type}-card`;
    const elClass = customElements.get(tag);

    let elementConfig;
    try {
      elementConfig = await elClass.getConfigElement();
      elementConfig.setConfig(conf);
      elementConfig.hass = this.hass;
      elementConfig.addEventListener("config-changed", (ev) =>
        this._handleConfigChanged(ev.detail.config)
      );
      this._elementConfig = elementConfig;
    } catch (err) {
      this._elementConfig = null;
    }

    // This will center the dialog with the updated config Element
    fireEvent(this._dialog, "iron-resize");
  }

  private async _updateConfig(): Promise<void> {
    if (this._currentConfigYaml === this._originalConfigYaml) {
      this._dialog.close();
      return;
    }
    try {
      await updateCardConfig(
        this.hass!,
        this._cardId!,
        this._currentConfigYaml
      );
      this._dialog.close();
      this._reloadLovelace!();
    } catch (err) {
      alert(`Saving failed: ${err.reason}`);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}

customElements.define("hui-dialog-edit-card", HuiDialogEditCard);
