import {
  css,
  html,
  LitElement,
  TemplateResult,
  CSSResultArray,
  customElement,
  property,
} from "lit-element";

import deepFreeze from "deep-freeze";

import { HomeAssistant } from "../../../../types";
import { HASSDomEvent } from "../../../../common/dom/fire_event";
import {
  LovelaceCardConfig,
  LovelaceViewConfig,
} from "../../../../data/lovelace";
import "./hui-card-editor";
// tslint:disable-next-line
import { HuiCardEditor } from "./hui-card-editor";
import "./hui-card-preview";
import "./hui-card-picker";
import { EditCardDialogParams } from "./show-edit-card-dialog";
import { addCard, replaceCard } from "../config-util";

import "../../../../components/dialog/ha-paper-dialog";
import { haStyleDialog } from "../../../../resources/styles";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";

declare global {
  // for fire event
  interface HASSDomEvents {
    "reload-lovelace": undefined;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "reload-lovelace": HASSDomEvent<undefined>;
  }
}

@customElement("hui-dialog-edit-card")
export class HuiDialogEditCard extends LitElement {
  @property() protected hass!: HomeAssistant;

  @property() private _params?: EditCardDialogParams;

  @property() private _cardConfig?: LovelaceCardConfig;
  @property() private _viewConfig!: LovelaceViewConfig;

  @property() private _saving: boolean = false;
  @property() private _error?: string;

  public async showDialog(params: EditCardDialogParams): Promise<void> {
    this._params = params;
    const [view, card] = params.path;
    this._viewConfig = params.lovelaceConfig.views[view];
    this._cardConfig =
      card !== undefined ? this._viewConfig.cards![card] : undefined;
    if (this._cardConfig && !Object.isFrozen(this._cardConfig)) {
      this._cardConfig = deepFreeze(this._cardConfig);
    }
  }

  private get _cardEditorEl(): HuiCardEditor | null {
    return this.shadowRoot!.querySelector("hui-card-editor");
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    let heading: string;
    if (this._cardConfig && this._cardConfig.type) {
      heading = `${this.hass!.localize(
        `ui.panel.lovelace.editor.card.${this._cardConfig.type}.name`
      )} ${this.hass!.localize("ui.panel.lovelace.editor.edit_card.header")}`;
    } else if (!this._cardConfig) {
      heading = this._viewConfig.title
        ? this.hass!.localize(
            "ui.panel.lovelace.editor.edit_card.pick_card_view_title",
            "name",
            `"${this._viewConfig.title}"`
          )
        : this.hass!.localize("ui.panel.lovelace.editor.edit_card.pick_card");
    } else {
      heading = this.hass!.localize(
        "ui.panel.lovelace.editor.edit_card.header"
      );
    }

    return html`
      <ha-paper-dialog with-backdrop opened modal @keyup=${this._handleKeyUp}>
        <h2>
          ${heading}
        </h2>
        <paper-dialog-scrollable>
          ${this._cardConfig === undefined
            ? html`
                <hui-card-picker
                  .hass="${this.hass}"
                  @config-changed="${this._handleCardPicked}"
                ></hui-card-picker>
              `
            : html`
                <div class="content">
                  <div class="element-editor">
                    <hui-card-editor
                      .hass="${this.hass}"
                      .value="${this._cardConfig}"
                      @config-changed="${this._handleConfigChanged}"
                    ></hui-card-editor>
                  </div>
                  <div class="element-preview">
                    <hui-card-preview
                      .hass="${this.hass}"
                      .config="${this._cardConfig}"
                      class=${this._error ? "blur" : ""}
                    ></hui-card-preview>
                    ${this._error
                      ? html`
                          <paper-spinner
                            active
                            alt="Can't update card"
                          ></paper-spinner>
                        `
                      : ``}
                  </div>
                </div>
              `}
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._close}">
            ${this.hass!.localize("ui.common.cancel")}
          </mwc-button>
          ${this._cardConfig !== undefined
            ? html`
                <mwc-button
                  ?disabled="${!this._canSave || this._saving}"
                  @click="${this._save}"
                >
                  ${this._saving
                    ? html`
                        <paper-spinner active alt="Saving"></paper-spinner>
                      `
                    : this.hass!.localize("ui.common.save")}
                </mwc-button>
              `
            : ``}
        </div>
      </ha-paper-dialog>
    `;
  }

  static get styles(): CSSResultArray {
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

        @media all and (min-width: 850px) {
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
          margin: 4px auto;
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
            padding: 8px 0;
            margin: auto 10px;
            max-width: 500px;
          }
        }

        mwc-button paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
        .hidden {
          display: none;
        }
        .element-editor {
          margin-bottom: 8px;
        }
        .blur {
          filter: blur(2px) grayscale(100%);
        }
        .element-preview {
          position: relative;
        }
        .element-preview paper-spinner {
          top: 50%;
          left: 50%;
          position: absolute;
          z-index: 10;
        }
        hui-card-preview {
          padding-top: 8px;
          margin-bottom: 4px;
          display: block;
          width: 100%;
        }
      `,
    ];
  }

  private _handleCardPicked(ev) {
    const config = ev.detail.config;
    if (this._params!.entities && this._params!.entities.length > 0) {
      if (Object.keys(config).includes("entities")) {
        config.entities = this._params!.entities;
      } else if (Object.keys(config).includes("entity")) {
        config.entity = this._params!.entities[0];
      }
    }
    this._cardConfig = deepFreeze(config);
    this._error = ev.detail.error;
  }

  private _handleConfigChanged(ev) {
    this._cardConfig = deepFreeze(ev.detail.config);
    this._error = ev.detail.error;
  }

  private _handleKeyUp(ev: KeyboardEvent) {
    if (ev.keyCode === 27) {
      this._close();
    }
  }

  private _close(): void {
    this._params = undefined;
    this._cardConfig = undefined;
    this._error = undefined;
  }

  private get _canSave(): boolean {
    if (this._saving) {
      return false;
    }
    if (this._cardConfig === undefined) {
      return false;
    }
    if (this._cardEditorEl && this._cardEditorEl.hasError) {
      return false;
    }
    return true;
  }

  private async _save(): Promise<void> {
    this._saving = true;
    await this._params!.saveConfig(
      this._params!.path.length === 1
        ? addCard(
            this._params!.lovelaceConfig,
            this._params!.path as [number],
            this._cardConfig!
          )
        : replaceCard(
            this._params!.lovelaceConfig,
            this._params!.path as [number, number],
            this._cardConfig!
          )
    );
    this._saving = false;
    showSaveSuccessToast(this, this.hass);
    this._close();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}
