import {
  html,
  css,
  LitElement,
  PropertyValues,
  TemplateResult,
  CSSResult,
  customElement,
  property,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import yaml from "js-yaml";

import { haStyleDialog } from "../../../../resources/styles";

import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-dialog/paper-dialog";
import "../../../../components/dialog/ha-paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HaPaperDialog } from "../../../../components/dialog/ha-paper-dialog";
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
import { ConfigError } from "../types";
import { EntityConfig } from "../../entity-rows/types";
import { getCardElementTag } from "../../common/get-card-element-tag";
import { afterNextRender } from "../../../../common/util/render-status";

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

@customElement("hui-edit-card")
export class HuiEditCard extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public cardConfig?: LovelaceCardConfig;

  public lovelace?: Lovelace;

  public closeDialog?: () => void;

  public saveCard?: (cardConf: LovelaceCardConfig) => Promise<void>;

  public newCard?: boolean;

  @property() private _configElement?: LovelaceCardEditor | null;

  @property() private _uiEditor?: boolean;

  @property() private _cardConfig?: LovelaceCardConfig;

  @property() private _configState?: string;

  @property() private _loading?: boolean;

  @property() private _saving: boolean;

  @property() private _errorMsg?: TemplateResult;

  private get _dialog(): HaPaperDialog {
    return this.shadowRoot!.querySelector("ha-paper-dialog")!;
  }

  private get _previewEl(): HuiCardPreview {
    return this.shadowRoot!.querySelector("hui-card-preview")!;
  }

  // tslint:disable-next-line
  private __cardYaml: string | undefined;

  private get _cardYaml(): string | undefined {
    if (!this.__cardYaml) {
      this.__cardYaml = yaml.safeDump(this._cardConfig);
    }
    return this.__cardYaml;
  }

  private set _cardYaml(yml: string | undefined) {
    this.__cardYaml = yml;
  }

  public constructor() {
    super();
    this._saving = false;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!changedProperties.has("cardConfig")) {
      return;
    }

    this._cardConfig = undefined;
    this._cardYaml = undefined;
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
                  .value="${this._cardYaml}"
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
      <ha-paper-dialog
        with-backdrop
        opened
        modal
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
                  ?disabled="${this._saving || this._configState !== "OK"}"
                  @click="${this._save}"
                >
                  <paper-spinner
                    ?active="${this._saving}"
                    alt="Saving"
                  ></paper-spinner>
                  ${this.hass!.localize("ui.common.save")}
                </mwc-button>
              </div>
            `
          : ""}
      </ha-paper-dialog>
    `;
  }

  private async _loadedDialog(): Promise<void> {
    await this.updateComplete;
    this._loading = false;
    this._resizeDialog();
    if (!this._uiEditor) {
      afterNextRender(() => {
        this.yamlEditor.codemirror.refresh();
        this._resizeDialog();
        this.yamlEditor.codemirror.focus();
      });
    }
  }

  private async _resizeDialog(): Promise<void> {
    await this.updateComplete;
    fireEvent(this._dialog as HTMLElement, "iron-resize");
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

    try {
      await this.saveCard!(this._cardConfig!);
      this._cardYaml = undefined;
      this.closeDialog!();
    } catch (err) {
      alert(`Saving failed: ${err.message}`);
    } finally {
      this._saving = false;
    }
  }

  private _handleYamlChanged(ev: CustomEvent): void {
    try {
      this._cardConfig = yaml.safeLoad(ev.detail.value);
      this._updatePreview(this._cardConfig!);
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
    this._cardConfig = value;
    this._updatePreview(value);
  }

  private async _updatePreview(config: LovelaceCardConfig): Promise<void> {
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

  private _setPreviewError(error: ConfigError): void {
    if (!this._previewEl) {
      return;
    }
    this._previewEl.error = error;

    this._resizeDialog();
  }

  private async _toggleEditor(): Promise<void> {
    this._cardYaml = undefined;
    if (this._uiEditor) {
      this._uiEditor = false;
    } else if (this._configElement) {
      const success = await this._loadConfigElement(this._cardConfig!);
      if (!success) {
        this._loadedDialog();
      } else {
        this._uiEditor = true;
        this._configElement.setConfig(this._cardConfig!);
      }
    }
    this._resizeDialog();
  }

  private _isConfigValid(): boolean {
    if (!this._cardConfig) {
      return false;
    }
    if (this._configState === "OK") {
      return true;
    } else {
      return false;
    }
  }

  private _isConfigChanged(): boolean {
    if (this.newCard) {
      return true;
    }
    return JSON.stringify(this._cardConfig) !== JSON.stringify(this.cardConfig);
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

    this._cardConfig = conf;

    if (elClass && elClass.getConfigElement) {
      configElement = await elClass.getConfigElement();
    } else {
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
      this._updatePreview(conf);
      this._uiEditor = false;
      this._configElement = null;
      return false;
    }

    configElement.hass = this.hass;
    configElement.addEventListener("config-changed", (ev) =>
      this._handleUIConfigChanged(ev.detail.config)
    );
    this._configElement = configElement;
    await this.updateComplete;
    this._updatePreview(conf);
    return true;
  }

  private _openedChanged(ev): void {
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
        :host {
          --code-mirror-max-height: calc(100vh - 176px);
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-paper-dialog {
            max-height: 100%;
            height: 100%;
          }
        }

        @media all and (min-width: 660px) {
          ha-paper-dialog {
            width: 845px;
          }
        }

        ha-paper-dialog {
          max-width: 845px;
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
          margin: 0 auto;
          max-width: 390px;
        }
        .content .element-editor {
          margin: 0 10px;
        }

        @media (min-width: 1200px) {
          ha-paper-dialog {
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
            padding-top: 0;
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
