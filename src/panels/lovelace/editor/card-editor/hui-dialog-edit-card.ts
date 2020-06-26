import deepFreeze from "deep-freeze";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
  PropertyValues,
} from "lit-element";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog";
import type {
  LovelaceCardConfig,
  LovelaceViewConfig,
} from "../../../../data/lovelace";
import { haStyleDialog } from "../../../../resources/styles";
import "../../../../components/ha-circular-progress";
import type { HomeAssistant } from "../../../../types";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";
import { addCard, replaceCard } from "../config-util";
import type { GUIModeChangedEvent } from "../types";
import "./hui-card-editor";
import type { ConfigChangedEvent, HuiCardEditor } from "./hui-card-editor";
import "./hui-card-picker";
import "./hui-card-preview";
import type { EditCardDialogParams } from "./show-edit-card-dialog";
import { getCardDocumentationURL } from "../get-card-documentation-url";
import { mdiHelpCircle } from "@mdi/js";

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

  @property() private _saving = false;

  @property() private _error?: string;

  @property() private _guiModeAvailable? = true;

  @query("hui-card-editor") private _cardEditorEl?: HuiCardEditor;

  @property() private _GUImode = true;

  @property() private _documentationURL?: string;

  public async showDialog(params: EditCardDialogParams): Promise<void> {
    this._params = params;
    this._GUImode = true;
    this._guiModeAvailable = true;
    const [view, card] = params.path;
    this._viewConfig = params.lovelaceConfig.views[view];
    this._cardConfig =
      card !== undefined ? this._viewConfig.cards![card] : params.cardConfig;
    if (this._cardConfig && !Object.isFrozen(this._cardConfig)) {
      this._cardConfig = deepFreeze(this._cardConfig);
    }
  }

  protected updated(changedProps: PropertyValues): void {
    if (
      !this._cardConfig ||
      this._documentationURL !== undefined ||
      !changedProps.has("_cardConfig")
    ) {
      return;
    }

    const oldConfig = changedProps.get("_cardConfig") as LovelaceCardConfig;

    if (oldConfig?.type !== this._cardConfig!.type) {
      this._documentationURL = getCardDocumentationURL(this._cardConfig!.type);
    }
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
      <ha-dialog
        open
        scrimClickAction
        @keydown=${this._ignoreKeydown}
        @closed=${this._close}
        .heading=${html`${heading}
        ${this._documentationURL !== undefined
          ? html`
              <a
                class="header_button"
                href=${this._documentationURL}
                title=${this.hass!.localize("ui.panel.lovelace.menu.help")}
                target="_blank"
                rel="noreferrer"
              >
                <mwc-icon-button>
                  <ha-svg-icon path=${mdiHelpCircle}></ha-svg-icon>
                </mwc-icon-button>
              </a>
            `
          : ""}`}
      >
        <div>
          ${this._cardConfig === undefined
            ? html`
                <hui-card-picker
                  .lovelace=${this._params.lovelaceConfig}
                  .hass=${this.hass}
                  @config-changed=${this._handleCardPicked}
                ></hui-card-picker>
              `
            : html`
                <div class="content">
                  <div class="element-editor">
                    <hui-card-editor
                      .hass=${this.hass}
                      .lovelace=${this._params.lovelaceConfig}
                      .value=${this._cardConfig}
                      @config-changed=${this._handleConfigChanged}
                      @GUImode-changed=${this._handleGUIModeChanged}
                      @editor-save=${this._save}
                    ></hui-card-editor>
                  </div>
                  <div class="element-preview">
                    <hui-card-preview
                      .hass=${this.hass}
                      .config=${this._cardConfig}
                      class=${this._error ? "blur" : ""}
                    ></hui-card-preview>
                    ${this._error
                      ? html`
                          <ha-circular-progress
                            active
                            alt="Can't update card"
                          ></ha-circular-progress>
                        `
                      : ``}
                  </div>
                </div>
              `}
        </div>
        ${this._cardConfig !== undefined
          ? html`
              <mwc-button
                slot="secondaryAction"
                @click=${this._toggleMode}
                .disabled=${!this._guiModeAvailable}
                class="gui-mode-button"
              >
                ${this.hass!.localize(
                  !this._cardEditorEl || this._GUImode
                    ? "ui.panel.lovelace.editor.edit_card.show_code_editor"
                    : "ui.panel.lovelace.editor.edit_card.show_visual_editor"
                )}
              </mwc-button>
            `
          : ""}
        <div slot="primaryAction" @click=${this._save}>
          <mwc-button @click=${this._close}>
            ${this.hass!.localize("ui.common.cancel")}
          </mwc-button>
          ${this._cardConfig !== undefined
            ? html`
                <mwc-button
                  ?disabled=${!this._canSave || this._saving}
                  @click=${this._save}
                >
                  ${this._saving
                    ? html`
                        <ha-circular-progress
                          active
                          alt="Saving"
                          size="small"
                        ></ha-circular-progress>
                      `
                    : this.hass!.localize("ui.common.save")}
                </mwc-button>
              `
            : ``}
        </div>
      </ha-dialog>
    `;
  }

  private _ignoreKeydown(ev: KeyboardEvent) {
    ev.stopPropagation();
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
          ha-dialog {
            --mdc-dialog-max-height: 100%;
            height: 100%;
          }
        }

        @media all and (min-width: 850px) {
          ha-dialog {
            --mdc-dialog-min-width: 845px;
          }
        }

        ha-dialog {
          --mdc-dialog-max-width: 845px;
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
          ha-dialog {
            --mdc-dialog-max-width: calc(100% - 32px);
            --mdc-dialog-min-width: 1000px;
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
            padding: 8px 10px;
            margin: auto 0px;
            max-width: 500px;
          }
        }

        mwc-button ha-circular-progress {
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
        .element-preview ha-circular-progress {
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
          box-sizing: border-box;
        }
        .gui-mode-button {
          margin-right: auto;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      `,
    ];
  }

  private _handleCardPicked(ev) {
    const config = ev.detail.config;
    if (this._params!.entities && this._params!.entities.length) {
      if (Object.keys(config).includes("entities")) {
        config.entities = this._params!.entities;
      } else if (Object.keys(config).includes("entity")) {
        config.entity = this._params!.entities[0];
      }
    }
    this._cardConfig = deepFreeze(config);
    this._error = ev.detail.error;
  }

  private _handleConfigChanged(ev: HASSDomEvent<ConfigChangedEvent>) {
    this._cardConfig = deepFreeze(ev.detail.config);
    this._error = ev.detail.error;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._GUImode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  private _close(): void {
    this._params = undefined;
    this._cardConfig = undefined;
    this._error = undefined;
    this._documentationURL = undefined;
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
    if (!this._canSave || this._saving) {
      return;
    }
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
