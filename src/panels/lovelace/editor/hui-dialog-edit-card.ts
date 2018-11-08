import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { when } from "lit-html/directives/when";
import { TemplateResult } from "lit-html";
import yaml from "js-yaml";

import "@polymer/paper-button/paper-button";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-dialog/paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import { HomeAssistant } from "../../../types";
import { updateCardConfig } from "../common/data";
import { fireEvent } from "../../../common/dom/fire_event";

import "./hui-yaml-editor";
import "./hui-card-preview";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiCardPreview } from "./hui-card-preview";
import { LovelaceCardEditor, LovelaceConfig } from "../types";
import { YamlChangedEvent, ConfigValue } from "./types";

const CUSTOM_TYPE_PREFIX = "custom:";

export class HuiDialogEditCard extends LitElement {
  protected hass?: HomeAssistant;
  private _cardId?: string;
  private _originalConfig?: LovelaceConfig;
  private _configElement?: LovelaceCardEditor | null;
  private _reloadLovelace?: () => void;
  private _jsEditor?: boolean;
  private _configValue?: ConfigValue;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cardId: { type: String },
      _dialogClosedCallback: {},
      _configElement: {},
      _jsEditor: {},
    };
  }

  public async showDialog({ hass, cardId, cardConfig, reloadLovelace }) {
    this.hass = hass;
    this._cardId = cardId;
    this._reloadLovelace = reloadLovelace;
    this._jsEditor = true;
    this._originalConfig = cardConfig;
    this._configElement = undefined;
    this._configValue = { format: "js", value: "" };
    this._loadConfigElement();
    // Wait till dialog is rendered.
    await this.updateComplete;
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
            this._jsEditor && this._configElement !== null
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
                    .yaml="${this._configValue!.value}"
                    .cardId="${this._cardId}"
                    .hass="${this.hass}"
                    @yaml-changed="${this._handleYamlChanged}"
                  ></hui-yaml-editor>
                `
          }
          <hui-card-preview
            .hass="${this.hass}"
            .value="${this._configValue!.value}"
          ></hui-yaml-card-preview>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <paper-button @click="${this._toggleEditor}"
            >Toggle Editor</paper-button
          >
          <paper-button @click="${this._closeDialog}">Cancel</paper-button>
          <paper-button @click="${this._updateConfigInBackend}"
            >Save</paper-button
          >
        </div>
      </paper-dialog>
    `;
  }

  private _handleYamlChanged(ev: YamlChangedEvent): void {
    this._configValue = {
      format: "yaml",
      value: ev.detail.yaml,
    };
    this._updatePreview(yaml.safeLoad(this._configValue.value));
  }

  private _handleJSConfigChanged(value: LovelaceConfig): void {
    this._configElement!.setConfig(value);
    this._configValue = { format: "js", value };
    this._updatePreview(this._configValue.value);
  }

  private _updatePreview(value: LovelaceConfig) {
    if (!this._previewEl) {
      return;
    }
    this._previewEl.value = value;

    fireEvent(this._dialog, "iron-resize");
  }

  private _closeDialog(): void {
    this._dialog.close();
  }

  private _configChanged() {
    const configValue =
      this._configValue!.format === "yaml"
        ? yaml.safeDump(this._configValue!.value)
        : this._configValue!.value;
    if (configValue === this._originalConfig) {
      return false;
    } else {
      return true;
    }
  }

  private _toggleEditor(): void {
    if (this._jsEditor && this._configValue!.format === "js") {
      if (this._configChanged()) {
        this._configValue = {
          format: "yaml",
          value: yaml.safeDump(this._configValue!.value),
        };
      } else {
        this._configValue = {
          format: "yaml",
          value: "",
        };
      }
    } else if (this._configElement && this._configValue!.format === "yaml") {
      this._configValue = {
        format: "js",
        value: yaml.safeLoad(this._configValue!.value),
      };
      this._configElement.setConfig(this._configValue!.value as LovelaceConfig);
    }
    this._jsEditor = !this._jsEditor;
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
      this._handleJSConfigChanged(ev.detail.config)
    );
    this._configValue = { format: "js", value: conf };
    this._configElement = configElement;

    // This will center the dialog with the updated config Element
    fireEvent(this._dialog, "iron-resize");
  }

  private async _updateConfigInBackend(): Promise<void> {
    if (!this._configChanged()) {
      this._dialog.close();
      return;
    }

    try {
      await updateCardConfig(
        this.hass!,
        this._cardId!,
        this._configValue!.value,
        this._configValue!.format
      );
      this._dialog.close();
      this._reloadLovelace!();
    } catch (err) {
      alert(`Saving failed: ${err.message}`);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}

customElements.define("hui-dialog-edit-card", HuiDialogEditCard);
