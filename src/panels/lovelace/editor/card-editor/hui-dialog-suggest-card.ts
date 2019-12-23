import {
  css,
  html,
  LitElement,
  TemplateResult,
  CSSResultArray,
  customElement,
  property,
  query,
} from "lit-element";

import { HomeAssistant } from "../../../../types";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import "./hui-card-editor";
import "./hui-card-preview";
import "./hui-card-picker";
import { addCards } from "../config-util";

import "../../../../components/ha-yaml-editor";
import "../../../../components/dialog/ha-paper-dialog";
import { haStyleDialog } from "../../../../resources/styles";
import { showEditCardDialog } from "./show-edit-card-dialog";
import { computeCards } from "../../common/generate-lovelace-config";
import { SuggestCardDialogParams } from "./show-suggest-card-dialog";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";
// tslint:disable-next-line
import { HaPaperDialog } from "../../../../components/dialog/ha-paper-dialog";
// tslint:disable-next-line
import { HaYamlEditor } from "../../../../components/ha-yaml-editor";

@customElement("hui-dialog-suggest-card")
export class HuiDialogSuggestCard extends LitElement {
  @property() protected hass!: HomeAssistant;
  @property() private _params?: SuggestCardDialogParams;
  @property() private _cardConfig?: LovelaceCardConfig[];
  @property() private _saving: boolean = false;
  @property() private _yamlMode: boolean = false;
  @query("ha-paper-dialog") private _dialog?: HaPaperDialog;
  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  public async showDialog(params: SuggestCardDialogParams): Promise<void> {
    this._params = params;
    this._yamlMode =
      (this.hass.panels.lovelace?.config as any)?.mode === "yaml";
    this._cardConfig =
      params.cardConfig ||
      computeCards(
        params.entities.map((entityId) => [
          entityId,
          this.hass.states[entityId],
        ]),
        {}
      );
    if (this._dialog) {
      this._dialog.open();
    }
    if (this._yamlEditor) {
      this._yamlEditor.setValue(this._cardConfig);
    }
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-paper-dialog with-backdrop opened>
        <h2>
          ${this.hass!.localize("ui.panel.lovelace.editor.suggest_card.header")}
        </h2>
        <paper-dialog-scrollable>
          ${this._cardConfig
            ? html`
                <div class="element-preview">
                  ${this._cardConfig.map(
                    (cardConfig) => html`
                      <hui-card-preview
                        .hass="${this.hass}"
                        .config="${cardConfig}"
                      ></hui-card-preview>
                    `
                  )}
                </div>
              `
            : ""}
          ${this._yamlMode && this._cardConfig
            ? html`
                <div class="editor">
                  <ha-yaml-editor .value=${this._cardConfig}></ha-yaml-editor>
                </div>
              `
            : ""}
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._close}">
            ${this._yamlMode
              ? this.hass!.localize("ui.common.close")
              : this.hass!.localize("ui.common.cancel")}
          </mwc-button>
          ${!this._yamlMode
            ? html`
                <mwc-button @click="${this._pickCard}"
                  >${this.hass!.localize(
                    "ui.panel.lovelace.editor.suggest_card.create_own"
                  )}</mwc-button
                >
                <mwc-button ?disabled="${this._saving}" @click="${this._save}">
                  ${this._saving
                    ? html`
                        <paper-spinner active alt="Saving"></paper-spinner>
                      `
                    : this.hass!.localize(
                        "ui.panel.lovelace.editor.suggest_card.add"
                      )}
                </mwc-button>
              `
            : ""}
        </div>
      </ha-paper-dialog>
    `;
  }

  static get styles(): CSSResultArray {
    return [
      haStyleDialog,
      css`
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-paper-dialog {
            max-height: 100%;
            height: 100%;
          }
        }
        @media all and (min-width: 850px) {
          ha-paper-dialog {
            width: 845px;
          }
        }
        ha-paper-dialog {
          max-width: 845px;
        }
        mwc-button paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
        .hidden {
          display: none;
        }
        .element-preview {
          position: relative;
        }
        hui-card-preview {
          padding-top: 8px;
          margin: 4px auto;
          max-width: 390px;
          display: block;
          width: 100%;
        }
        .editor {
          padding-top: 16px;
        }
      `,
    ];
  }

  private _close(): void {
    this._dialog!.close();
    this._params = undefined;
    this._cardConfig = undefined;
    this._yamlMode = false;
  }

  private _pickCard(): void {
    if (
      !this._params?.lovelaceConfig ||
      !this._params?.path ||
      !this._params?.saveConfig
    ) {
      return;
    }
    showEditCardDialog(this, {
      lovelaceConfig: this._params!.lovelaceConfig,
      saveConfig: this._params!.saveConfig,
      path: this._params!.path,
      entities: this._params!.entities,
    });
    this._close();
  }

  private async _save(): Promise<void> {
    if (
      !this._params?.lovelaceConfig ||
      !this._params?.path ||
      !this._params?.saveConfig ||
      !this._cardConfig
    ) {
      return;
    }
    this._saving = true;
    await this._params!.saveConfig(
      addCards(
        this._params!.lovelaceConfig,
        this._params!.path as [number],
        this._cardConfig
      )
    );
    this._saving = false;
    showSaveSuccessToast(this, this.hass);
    this._close();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-suggest-card": HuiDialogSuggestCard;
  }
}
