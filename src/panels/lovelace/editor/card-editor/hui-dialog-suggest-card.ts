import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import deepFreeze from "deep-freeze";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import "../../../../components/dialog/ha-paper-dialog";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";
import { computeCards } from "../../common/generate-lovelace-config";
import { addCards } from "../config-util";
import "./hui-card-preview";
import { showCreateCardDialog } from "./show-create-card-dialog";
import { SuggestCardDialogParams } from "./show-suggest-card-dialog";

@customElement("hui-dialog-suggest-card")
export class HuiDialogSuggestCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _params?: SuggestCardDialogParams;

  @internalProperty() private _cardConfig?: LovelaceCardConfig[];

  @internalProperty() private _saving = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  public showDialog(params: SuggestCardDialogParams): void {
    this._params = params;
    this._cardConfig =
      params.cardConfig ||
      computeCards(
        params.entities.map((entityId) => [
          entityId,
          this.hass.states[entityId],
        ]),
        {},
        true
      );
    if (!Object.isFrozen(this._cardConfig)) {
      this._cardConfig = deepFreeze(this._cardConfig);
    }
    if (this._yamlEditor) {
      this._yamlEditor.setValue(this._cardConfig);
    }
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
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
                        .hass=${this.hass}
                        .config="${cardConfig}"
                      ></hui-card-preview>
                    `
                  )}
                </div>
              `
            : ""}
          ${this._params.yaml && this._cardConfig
            ? html`
                <div class="editor">
                  <ha-yaml-editor
                    .defaultValue=${this._cardConfig}
                  ></ha-yaml-editor>
                </div>
              `
            : ""}
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._close}">
            ${this._params.yaml
              ? this.hass!.localize("ui.common.close")
              : this.hass!.localize("ui.common.cancel")}
          </mwc-button>
          ${!this._params.yaml
            ? html`
                <mwc-button @click="${this._pickCard}"
                  >${this.hass!.localize(
                    "ui.panel.lovelace.editor.suggest_card.create_own"
                  )}</mwc-button
                >
                <mwc-button ?disabled="${this._saving}" @click="${this._save}">
                  ${this._saving
                    ? html`
                        <ha-circular-progress
                          active
                          title="Saving"
                          size="small"
                        ></ha-circular-progress>
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
          --dialog-z-index: 5;
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
    this._params = undefined;
    this._cardConfig = undefined;
  }

  private _pickCard(): void {
    if (
      !this._params?.lovelaceConfig ||
      !this._params?.path ||
      !this._params?.saveConfig
    ) {
      return;
    }

    showCreateCardDialog(this, {
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
