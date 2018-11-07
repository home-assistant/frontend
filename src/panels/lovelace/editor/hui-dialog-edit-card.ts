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
import { YamlChangedEvent, ConfigValue } from "./types";

const CUSTOM_TYPE_PREFIX = "custom:";

export class HuiDialogEditCard extends LitElement {
  protected hass?: HomeAssistant;
  private _cardId?: string;
  private _originalConfigYaml?: string;
  private _configElement?: LovelaceCardEditor | null;
  private _reloadLovelace?: () => void;
  private _editorToggle?: boolean;
  private _configValue?: ConfigValue;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cardId: {
        type: Number,
      },
      _dialogClosedCallback: {},
      _configElement: {},
      _editorToggle: {},
    };
  }

  public async showDialog({ hass, cardId, reloadLovelace }) {
    this.hass = hass;
    this._cardId = cardId;
    this._reloadLovelace = reloadLovelace;
    this._editorToggle = true;
    this._configElement = undefined;
    this._configValue = { format: "yaml", value: "" };
    this._loadConfig().then(() => this._loadConfigElement());
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
            this._editorToggle && this._configElement !== null
              ? html`
                  <div class="element-editor">
                    ${when(
                      this._configElement,
                      () => this._configElement,
                      () =>
                        html`
                            Loading...
                          `
                    )}
                  </div>
                `
              : html`
                  <hui-yaml-editor
                    .yaml="${this._configValue!.value}"
                    @yaml-changed="${this._handleYamlChanged}"
                  ></hui-yaml-editor>
                `
          }
          <hui-yaml-card-preview
            .hass=${this.hass}
            .value=${this._configValue}
          ></hui-yaml-card-preview>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <paper-button
            @click=${this._toggleEditor}
          >Toggle Editor</paper-button>
          <paper-button
            @click=${this._closeDialog}
          >Cancel</paper-button>
          <paper-button
            @click=${this._updateConfigInBackend}
          >Save</paper-button>
        </div>
      </paper-dialog>
    `;
  }

  private _handleYamlChanged(ev: YamlChangedEvent): void {
    this._configValue = { format: "yaml", value: ev.detail.yaml };
    this._updatePreview(this._configValue);
  }

  private _handleJSConfigChanged(value: LovelaceConfig): void {
    this._configElement!.setConfig(value);
    this._configValue = { format: "js", value };
    this._updatePreview(this._configValue);
  }

  private _updatePreview(value: ConfigValue) {
    if (!this._previewEl) {
      return;
    }
    this._previewEl.value = value;
  }

  private _closeDialog(): void {
    this._dialog.close();
  }

  private _toggleEditor(): void {
    if (this._editorToggle && this._configValue!.format === "js") {
      this._configValue = {
        format: "yaml",
        value: yaml.safeDump(this._configValue!.value),
      };
    } else if (this._configElement && this._configValue!.format === "yaml") {
      this._configValue = {
        format: "js",
        value: yaml.safeLoad(this._configValue!.value),
      };
      this._configElement.setConfig(this._configValue!.value as LovelaceConfig);
    }
    this._editorToggle = !this._editorToggle;
  }

  private async _loadConfig(): Promise<void> {
    const cardConfig = await getCardConfig(this.hass!, this._cardId!);
    this._configValue = {
      format: "yaml",
      value: cardConfig,
    };
    this._originalConfigYaml = cardConfig;

    // This will center the dialog with the updated config Element
    fireEvent(this._dialog, "iron-resize");
  }

  private async _loadConfigElement(): Promise<void> {
    const conf = yaml.safeLoad(this._configValue!.value);

    const tag = conf.type.startsWith(CUSTOM_TYPE_PREFIX)
      ? conf.type.substr(CUSTOM_TYPE_PREFIX.length)
      : `hui-${conf.type}-card`;

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
    if (this._configValue!.format === "js") {
      this._configValue = {
        format: "yaml",
        value: yaml.safeDump(this._configValue!.value),
      };
    }

    if (this._configValue!.value === this._originalConfigYaml) {
      this._dialog.close();
      return;
    }

    try {
      await updateCardConfig(
        this.hass!,
        this._cardId!,
        this._configValue!.value
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
