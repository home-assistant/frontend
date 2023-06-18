import deepFreeze from "deep-freeze";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
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

  @state() private _params?: SuggestCardDialogParams;

  @state() private _cardConfig?: LovelaceCardConfig[];

  @state() private _saving = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  public showDialog(params: SuggestCardDialogParams): void {
    this._params = params;
    this._cardConfig =
      params.cardConfig ||
      computeCards(this.hass.states, params.entities, {
        title: params.cardTitle,
      });
    if (!Object.isFrozen(this._cardConfig)) {
      this._cardConfig = deepFreeze(this._cardConfig);
    }
    if (this._yamlEditor) {
      this._yamlEditor.setValue(this._cardConfig);
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    this._cardConfig = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        @closed=${this.closeDialog}
        .heading=${this.hass!.localize(
          "ui.panel.lovelace.editor.suggest_card.header"
        )}
      >
        <div>
          ${this._cardConfig
            ? html`
                <div class="element-preview">
                  ${this._cardConfig.map(
                    (cardConfig) => html`
                      <hui-card-preview
                        .hass=${this.hass}
                        .config=${cardConfig}
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
                    .hass=${this.hass}
                    .defaultValue=${this._cardConfig}
                  ></ha-yaml-editor>
                </div>
              `
            : ""}
        </div>
        <mwc-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          dialogInitialFocus
        >
          ${this._params.yaml
            ? this.hass!.localize("ui.common.close")
            : this.hass!.localize("ui.common.cancel")}
        </mwc-button>
        ${!this._params.yaml
          ? html`
              <mwc-button slot="primaryAction" @click=${this._pickCard}
                >${this.hass!.localize(
                  "ui.panel.lovelace.editor.suggest_card.create_own"
                )}</mwc-button
              >
              <mwc-button
                slot="primaryAction"
                .disabled=${this._saving}
                @click=${this._save}
              >
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
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-dialog {
            max-height: 100%;
            height: 100%;
          }
        }
        @media all and (min-width: 850px) {
          ha-dialog {
            width: 845px;
          }
        }
        ha-dialog {
          max-width: 845px;
          --dialog-z-index: 6;
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
    this.closeDialog();
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
    this.closeDialog();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-suggest-card": HuiDialogSuggestCard;
  }
}
