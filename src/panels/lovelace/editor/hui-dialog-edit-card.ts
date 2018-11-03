import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import yaml from "js-yaml";
import { when } from "lit-html/directives/when";

import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-input/paper-textarea.js";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js";
import "@polymer/paper-dialog/paper-dialog.js";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import { HomeAssistant } from "../../../types";
import { getCardConfig, updateCardConfig } from "../common/data";
import { fireEvent } from "../../../common/dom/fire_event.js";

import "./hui-yaml-editor";
import "./hui-yaml-card-preview";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiYAMLCardPreview } from "./hui-yaml-card-preview";
import { LovelaceCardEditor, LovelaceConfig } from "../types";

export class HuiDialogEditCard extends LitElement {
  protected hass?: HomeAssistant;
  private _cardId?: string;
  private _cardConfig?: string;
  private _elementConfig?: LovelaceCardEditor;
  private _reloadLovelace?: () => void;
  private _editorToggle?: boolean;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cardId: {
        type: Number,
      },
      _cardConfig: {},
      _dialogClosedCallback: {},
      _elementConfig: {},
      _editorToggle: {},
    };
  }

  public async showDialog({ hass, cardId, reloadLovelace }) {
    this.hass = hass;
    this._cardId = cardId;
    this._reloadLovelace = reloadLovelace;
    this._cardConfig = "";
    this._editorToggle = true;
    this._elementConfig = undefined;
    this._loadConfig().then(() => this._loadElementConfig());
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

  protected render() {
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
            this._editorToggle
              ? html`<div class="element-editor">${when(
                  this._elementConfig,
                  () => this._elementConfig,
                  () => html`Loading...`
                )}</div>`
              : html`
              <hui-yaml-editor
                .yaml="${this._cardConfig}"
                @yaml-changed="${this._handleYamlChanged}"
              ></hui-yaml-editor>`
          }
          <hui-yaml-card-preview
            .hass="${this.hass}"
            .yaml="${this._cardConfig}"
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

  protected updated() {
    // This will center the dialog with the updated config
    fireEvent(this._dialog, "iron-resize");
  }

  private _handleYamlChanged(ev) {
    this._handleConfigChanged("yaml", ev.detail.yaml);
  }

  private _handleConfigChanged(
    format: string,
    value: LovelaceConfig | string
  ): void {
    if (!this._previewEl) {
      return;
    }

    if (format === "js") {
      this._cardConfig = yaml.safeDump(value);
    } else if (this._elementConfig) {
      this._elementConfig.setConfig(yaml.safeLoad(value));
    }

    this._previewEl.value = { format, value };
  }

  private _closeDialog(): void {
    this._dialog.close();
  }

  private _toggleEditor(): void {
    if (this._elementConfig === null) {
      return;
    }
    this._editorToggle = !this._editorToggle;
  }

  private async _loadConfig(): Promise<void> {
    this._cardConfig = await getCardConfig(this.hass!, this._cardId!);
  }

  private async _loadElementConfig(): Promise<void> {
    const conf = yaml.safeLoad(this._cardConfig);
    const elClass = customElements.get(`hui-${conf.type}-card`);
    let elementConfig;

    try {
      elementConfig = await elClass.getConfigElement();
    } catch (err) {
      // No Element Config Function on Element
      this._editorToggle = false;
      this._elementConfig = null;
      return;
    }

    if (!elementConfig) {
      this._editorToggle = false;
      this._elementConfig = null;
      return;
    }

    elementConfig.setConfig(conf);
    elementConfig.hass = this.hass;
    elementConfig.addEventListener("config-changed", (ev) =>
      this._handleConfigChanged("js", ev.detail.config)
    );
    this._elementConfig = elementConfig;
  }

  private async _updateConfig() {
    try {
      await updateCardConfig(this.hass!, this._cardId!, this._cardConfig);
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
