import {
  html,
  css,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
  TemplateResult,
  CSSResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import yaml from "js-yaml";

import { haStyleDialog } from "../../../../resources/ha-style";

import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-dialog/paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import { fireEvent } from "../../../../common/dom/fire_event";

import "../../components/hui-yaml-editor";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiYamlEditor } from "../../components/hui-yaml-editor";
import "./hui-card-preview";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiCardPreview } from "./hui-card-preview";
import { LovelaceCardEditor, Lovelace } from "../../types";
import { ConfigValue, ConfigError } from "../types";
import { EntityConfig } from "../../entity-rows/types";
import { getCardElementTag } from "../../common/get-card-element-tag";
import { addCard, replaceCard } from "../config-util";

declare global {
  interface HASSDomEvents {
    "entities-changed": {
      entities: EntityConfig[];
    };
    "config-changed": {
      config: LovelaceCardConfig;
    };
  }
}

export class HuiEditCard extends LitElement {
  public hass?: HomeAssistant;
  public lovelace?: Lovelace;
  public path?: [number] | [number, number];
  public cardConfig?: LovelaceCardConfig;
  public closeDialog?: () => void;
  private _configElement?: LovelaceCardEditor | null;
  private _uiEditor?: boolean;
  private _configValue?: ConfigValue;
  private _configState?: string;
  private _loading?: boolean;
  private _saving: boolean;
  private _errorMsg?: TemplateResult;
  private _cardType?: string;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cardConfig: {},
      viewIndex: {},
      _cardIndex: {},
      _configElement: {},
      _configValue: {},
      _configState: {},
      _errorMsg: {},
      _uiEditor: {},
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

  protected constructor() {
    super();
    this._saving = false;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!changedProperties.has("cardConfig")) {
      return;
    }

    this._configValue = { format: "yaml", value: undefined };
    this._configState = "OK";
    this._uiEditor = true;
    this._errorMsg = undefined;
    this._configElement = undefined;

    this._loading = true;
    this._loadConfigElement(this.cardConfig!);
  }

  protected render(): TemplateResult | void {
    let content;
    let preview;
    if (this._configElement !== undefined) {
      content = html`
        <div class="element-editor">
          ${this._uiEditor
            ? this._configElement
            : html`
                <hui-yaml-editor
                  .hass="${this.hass}"
                  .value="${this._configValue!.value}"
                  @yaml-changed="${this._handleYamlChanged}"
                  @yaml-save="${this._save}"
                ></hui-yaml-editor>
              `}
        </div>
      `;

      preview = html`
        <hui-card-preview .hass="${this.hass}"> </hui-card-preview>
      `;
    }

    return html`
      <paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>
          ${this.hass!.localize("ui.panel.lovelace.editor.edit_card.header")}
        </h2>
        <paper-spinner
          ?active="${this._loading}"
          alt="Loading"
          class="center margin-bot"
        ></paper-spinner>
        <paper-dialog-scrollable
          class="${classMap({ hidden: this._loading! })}"
        >
          ${this._errorMsg
            ? html`
                <div class="error">${this._errorMsg}</div>
              `
            : ""}
          <div class="content">${content}${preview}</div>
        </paper-dialog-scrollable>
        ${!this._loading
          ? html`
              <div class="paper-dialog-buttons">
                <mwc-button
                  class="toggle-button"
                  ?hidden="${!this._configValue || !this._configValue.value}"
                  ?disabled="${this._configElement === null ||
                    this._configState !== "OK"}"
                  @click="${this._toggleEditor}"
                  >${this.hass!.localize(
                    "ui.panel.lovelace.editor.edit_card.toggle_editor"
                  )}</mwc-button
                >
                <mwc-button @click="${this.closeDialog}"
                  >${this.hass!.localize("ui.common.cancel")}</mwc-button
                >
                <mwc-button
                  ?hidden="${!this._configValue || !this._configValue.value}"
                  ?disabled="${this._saving || this._configState !== "OK"}"
                  @click="${this._save}"
                >
                  <paper-spinner
                    ?active="${this._saving}"
                    alt="Saving"
                  ></paper-spinner>
                  ${this.hass!.localize("ui.common.save")}</mwc-button
                >
              </div>
            `
          : ""}
      </paper-dialog>
    `;
  }

  private async _loadedDialog(): Promise<void> {
    await this.updateComplete;
    this._loading = false;
    this._resizeDialog();
    if (!this._uiEditor) {
      setTimeout(() => {
        this.yamlEditor.codemirror.refresh();
      }, 50);
    }
  }

  private async _resizeDialog(): Promise<void> {
    await this.updateComplete;
    fireEvent(this._dialog, "iron-resize");
  }

  private async _save(): Promise<void> {
    if (!this._isConfigValid()) {
      alert("Your config is not valid, please fix your config before saving.");
      return;
    }

    if (!this._isConfigChanged()) {
      this.closeDialog!();
      return;
    }

    this._saving = true;

    const cardConf: LovelaceCardConfig =
      this._configValue!.format === "yaml"
        ? yaml.safeLoad(this._configValue!.value!)
        : this._configValue!.value!;

    try {
      const lovelace = this.lovelace!;
      await lovelace.saveConfig(
        this._creatingCard
          ? addCard(lovelace.config, this.path as [number], cardConf)
          : replaceCard(
              lovelace.config,
              this.path as [number, number],
              cardConf
            )
      );
      this.closeDialog!();
    } catch (err) {
      alert(`Saving failed: ${err.message}`);
    } finally {
      this._saving = false;
    }
  }

  private _handleYamlChanged(ev: CustomEvent): void {
    this._configValue = { format: "yaml", value: ev.detail.value };
    try {
      const config = yaml.safeLoad(
        this._configValue.value
      ) as LovelaceCardConfig;
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

  private _handleUIConfigChanged(value: LovelaceCardConfig): void {
    this._configValue = { format: "json", value };
    this._updatePreview(value);
  }

  private async _updatePreview(config: LovelaceCardConfig) {
    await this.updateComplete;

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

  private async _toggleEditor(): Promise<void> {
    if (this._uiEditor && this._configValue!.format === "json") {
      this._configValue = {
        format: "yaml",
        value: yaml.safeDump(this._configValue!.value),
      };
      this._uiEditor = !this._uiEditor;
    } else if (this._configElement && this._configValue!.format === "yaml") {
      const yamlConfig = this._configValue!.value;
      const cardConfig = yaml.safeLoad(yamlConfig) as LovelaceCardConfig;
      this._uiEditor = !this._uiEditor;
      if (cardConfig.type !== this._cardType) {
        const succes = await this._loadConfigElement(cardConfig);
        if (!succes) {
          this._loadedDialog();
        }
        this._cardType = cardConfig.type;
      } else {
        this._configValue = {
          format: "json",
          value: cardConfig,
        };
        this._configElement.setConfig(cardConfig);
      }
    }
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
    if (this._creatingCard) {
      return true;
    }
    const configValue =
      this._configValue!.format === "yaml"
        ? yaml.safeLoad(this._configValue!.value)
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

    const tag = getCardElementTag(conf.type);

    const elClass = customElements.get(tag);
    let configElement;

    if (elClass && elClass.getConfigElement) {
      configElement = await elClass.getConfigElement();
    } else {
      this._configValue = { format: "yaml", value: yaml.safeDump(conf) };
      this._updatePreview(conf);
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
      this._configValue = {
        format: "yaml",
        value: yaml.safeDump(conf),
      };
      this._updatePreview(conf);
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
    await this.updateComplete;
    this._updatePreview(conf);
    return true;
  }

  private get _creatingCard(): boolean {
    return this.path!.length === 1;
  }

  private _openedChanged(ev) {
    if (!ev.detail.value) {
      this.closeDialog!();
    }
  }

  private get yamlEditor(): HuiYamlEditor {
    return this.shadowRoot!.querySelector("hui-yaml-editor")!;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          paper-dialog {
            max-height: 100%;
            height: 100%;
          }
        }

        @media all and (min-width: 660px) {
          paper-dialog {
            width: 650px;
          }
        }

        paper-dialog {
          max-width: 650px;
        }

        .center {
          margin-left: auto;
          margin-right: auto;
        }

        .content {
          display: flex;
          flex-direction: column;
          margin: 0 -10px;
        }
        .content hui-card-preview {
          margin-top: 16px;
          margin: 0 10px;
        }
        .content .element-editor {
          margin: 0 10px;
        }

        @media (min-width: 1200px) {
          paper-dialog {
            max-width: none;
            width: 1000px;
          }

          .content {
            flex-direction: row;
          }
          .content > * {
            flex-basis: 0;
            flex-grow: 1;
            flex-shrink: 1;
            min-width: 0;
          }
          .content hui-card-preview {
            margin: 0 10px;
            max-width: 490px;
          }
        }

        .margin-bot {
          margin-bottom: 24px;
        }
        mwc-button paper-spinner {
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
        hui-card-preview {
          padding-top: 8px;
          margin-bottom: 4px;
          display: block;
        }
        .toggle-button {
          margin-right: auto;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-edit-card": HuiEditCard;
  }
}

customElements.define("hui-edit-card", HuiEditCard);
