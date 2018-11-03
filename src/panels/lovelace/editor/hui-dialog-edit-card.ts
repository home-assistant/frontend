import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import yaml from "js-yaml";
import { until } from "lit-html/directives/until";

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
    // await this._loadConfig();
    // await this._loadElementConfig();
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
    console.log(this._elementConfig);
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
            // Look to see if this has already be done if yes dont use until just render this._elementConfig
            this._showUIEditor
              ? html`<div class="element-editor">${until(
                  this._loadConfig().then(() => this._loadElementConfig()),
                  html`<span>Loading...</span>`
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

  private _handleYamlChanged(ev) {
    this._handleConfigChanged("yaml", ev.detail.yaml);
  }

  private _handleConfigChanged(type: string, changedProps: any): void {
    if (!this._previewEl) {
      return;
    }

    if (type === "js") {
      this._previewEl.config = changedProps;
    } else {
      this._previewEl.yaml = changedProps;
    }
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
    await this.updateComplete;
    // This will center the dialog with the updated config
    fireEvent(this._dialog, "iron-resize");
  }

  private async _loadElementConfig(): Promise<LovelaceCardEditor> {
    const conf = yaml.safeLoad(this._cardConfig);
    const elClass = customElements.get(`hui-${conf.type}-card`);
    let elementConfig;
    try {
      elementConfig = await elClass.getConfigElement();
    } catch (err) {
      // No Element Config Function on Element
      this._showUIEditor = false;
      return;
    }
    if (!elementConfig) {
      this._showUIEditor = false;
      return;
    }
    elementConfig.setConfig(conf);
    elementConfig.hass = this.hass;
    elementConfig.addEventListener("config-changed", (ev) =>
      this._handleConfigChanged("js", ev.detail.config)
    );
    this._elementConfig = elementConfig;
    return elementConfig;
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
