import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import yaml from "js-yaml";

import "@polymer/paper-checkbox/paper-checkbox.js";
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

import "../../../components/entity/ha-entity-picker";
import "./hui-yaml-editor";
import "./hui-yaml-card-preview";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiYAMLCardPreview } from "./hui-yaml-card-preview";
import { LovelaceCardEditor } from "../types";

export class HuiDialogEditCard extends LitElement {
  protected hass?: HomeAssistant;
  private _cardId?: string;
  private _cardConfig?: string;
  private _elementConfig?: LovelaceCardEditor;
  private _reloadLovelace?: () => void;
  private _showUIEditor?: boolean;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cardId: {
        type: Number,
      },
      _cardConfig: {},
      _dialogClosedCallback: {},
      _showUIEditor: {},
    };
  }

  public async showDialog({ hass, cardId, reloadLovelace }) {
    this.hass = hass;
    this._cardId = cardId;
    this._reloadLovelace = reloadLovelace;
    this._cardConfig = "";
    this._showUIEditor = true;
    this._loadConfig();
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
            this._showUIEditor && this._elementConfig
              ? html`<div class="element-editor">${this._elementConfig}</div>`
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
          <paper-button @click="${
            this._toggleEditor
          }">Toggle Editor</paper-button>
          <paper-button @click="${this._closeDialog}">Cancel</paper-button>
          <paper-button @click="${this._updateConfig}">Save</paper-button>
        </div>
      </paper-dialog>
    `;
  }

  private _handleYamlChanged(ev) {
    this._previewEl.yaml = ev.detail.yaml;
  }

  private _closeDialog() {
    this._dialog.close();
  }

  private _toggleEditor() {
    if (!this._elementConfig) {
      return;
    }
    this._showUIEditor = !this._showUIEditor;
    // This will center the dialog with the updated config
    fireEvent(this._dialog, "iron-resize");
  }

  private async _loadConfig() {
    this._cardConfig = await getCardConfig(this.hass!, this._cardId!);
    this._loadElementConfig();
    await this.updateComplete;
    // This will center the dialog with the updated config
    fireEvent(this._dialog, "iron-resize");
  }

  private async _loadElementConfig() {
    const conf = yaml.safeLoad(this._cardConfig);
    const elClass = customElements.get(`hui-${conf.type}-card`);

    try {
      this._elementConfig = await elClass.getElementConfig();
    } catch (err) {
      // No Element Config Function on Element
      this._showUIEditor = false;
      return;
    }
    if (!this._elementConfig) {
      this._showUIEditor = false;
      return;
    }
    this._elementConfig!.setConfig(conf);
    this._elementConfig!.hass = this.hass;
  }

  private async _updateConfig() {
    const newCardConfig = this.shadowRoot!.querySelector("hui-yaml-editor")!
      .yaml;

    if (this._cardConfig === newCardConfig) {
      this._dialog.close();
      return;
    }
    try {
      await updateCardConfig(this.hass!, this._cardId!, newCardConfig);
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
