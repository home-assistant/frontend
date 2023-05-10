import { mdiClose, mdiHelpCircle } from "@mdi/js";
import deepFreeze from "deep-freeze";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import "../../../../components/ha-circular-progress";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import type {
  LovelaceCardConfig,
  LovelaceViewConfig,
} from "../../../../data/lovelace";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";
import { addCard, replaceCard } from "../config-util";
import { getCardDocumentationURL } from "../get-card-documentation-url";
import type { ConfigChangedEvent } from "../hui-element-editor";
import type { GUIModeChangedEvent } from "../types";
import "./hui-card-element-editor";
import type { HuiCardElementEditor } from "./hui-card-element-editor";
import "./hui-card-preview";
import type { EditCardDialogParams } from "./show-edit-card-dialog";

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
export class HuiDialogEditCard
  extends LitElement
  implements HassDialog<EditCardDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public large = false;

  @state() private _params?: EditCardDialogParams;

  @state() private _cardConfig?: LovelaceCardConfig;

  @state() private _viewConfig!: LovelaceViewConfig;

  @state() private _saving = false;

  @state() private _error?: string;

  @state() private _guiModeAvailable? = true;

  @query("hui-card-element-editor")
  private _cardEditorEl?: HuiCardElementEditor;

  @state() private _GUImode = true;

  @state() private _documentationURL?: string;

  @state() private _dirty = false;

  @state() private _isEscapeEnabled = true;

  public async showDialog(params: EditCardDialogParams): Promise<void> {
    this._params = params;
    this._GUImode = true;
    this._guiModeAvailable = true;
    const [view, card] = params.path;
    this._viewConfig = params.lovelaceConfig.views[view];
    this._cardConfig =
      card !== undefined ? this._viewConfig.cards![card] : params.cardConfig;
    this.large = false;
    if (this._cardConfig && !Object.isFrozen(this._cardConfig)) {
      this._cardConfig = deepFreeze(this._cardConfig);
    }
    if (params.cardConfig) {
      this._dirty = true;
    }
  }

  public closeDialog(): boolean {
    this._isEscapeEnabled = true;
    window.removeEventListener("dialog-closed", this._enableEscapeKeyClose);
    window.removeEventListener("hass-more-info", this._disableEscapeKeyClose);
    if (this._dirty) {
      this._confirmCancel();
      return false;
    }
    this._params = undefined;
    this._cardConfig = undefined;
    this._error = undefined;
    this._documentationURL = undefined;
    this._dirty = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
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
      this._documentationURL = getCardDocumentationURL(
        this.hass,
        this._cardConfig!.type
      );
    }
  }

  private _enableEscapeKeyClose = (ev: any) => {
    if (ev.detail.dialog === "ha-more-info-dialog") {
      this._isEscapeEnabled = true;
    }
  };

  private _disableEscapeKeyClose = () => {
    this._isEscapeEnabled = false;
  };

  protected render() {
    if (!this._params) {
      return nothing;
    }

    let heading: string;
    if (this._cardConfig && this._cardConfig.type) {
      heading = this.hass!.localize(
        "ui.panel.lovelace.editor.edit_card.typed_header",
        "type",
        this.hass!.localize(
          `ui.panel.lovelace.editor.card.${this._cardConfig.type}.name`
        )
      );
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
        .escapeKeyAction=${this._isEscapeEnabled ? undefined : ""}
        @keydown=${this._ignoreKeydown}
        @closed=${this._cancel}
        @opened=${this._opened}
        .heading=${heading}
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title" @click=${this._enlarge}>${heading}</span>
          ${this._documentationURL !== undefined
            ? html`
                <a
                  slot="actionItems"
                  class="header_button"
                  href=${this._documentationURL}
                  title=${this.hass!.localize("ui.panel.lovelace.menu.help")}
                  target="_blank"
                  rel="noreferrer"
                  dir=${computeRTLDirection(this.hass)}
                >
                  <ha-icon-button .path=${mdiHelpCircle}></ha-icon-button>
                </a>
              `
            : nothing}
        </ha-dialog-header>
        <div class="content">
          <div class="element-editor">
            <hui-card-element-editor
              .hass=${this.hass}
              .lovelace=${this._params.lovelaceConfig}
              .value=${this._cardConfig}
              @config-changed=${this._handleConfigChanged}
              @GUImode-changed=${this._handleGUIModeChanged}
              @editor-save=${this._save}
              dialogInitialFocus
            ></hui-card-element-editor>
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
          <mwc-button @click=${this._cancel} dialogInitialFocus>
            ${this.hass!.localize("ui.common.cancel")}
          </mwc-button>
          ${this._cardConfig !== undefined && this._dirty
            ? html`
                <mwc-button
                  ?disabled=${!this._canSave || this._saving}
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
                    : this.hass!.localize("ui.common.save")}
                </mwc-button>
              `
            : ``}
        </div>
      </ha-dialog>
    `;
  }

  private _enlarge() {
    this.large = !this.large;
  }

  private _ignoreKeydown(ev: KeyboardEvent) {
    ev.stopPropagation();
  }

  private _handleConfigChanged(ev: HASSDomEvent<ConfigChangedEvent>) {
    this._cardConfig = deepFreeze(ev.detail.config);
    this._error = ev.detail.error;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
    this._dirty = true;
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._GUImode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  private _opened() {
    window.addEventListener("dialog-closed", this._enableEscapeKeyClose);
    window.addEventListener("hass-more-info", this._disableEscapeKeyClose);
    this._cardEditorEl?.focusYamlEditor();
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

  private async _confirmCancel() {
    // Make sure the open state of this dialog is handled before the open state of confirm dialog
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    const confirm = await showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.lovelace.editor.edit_card.unsaved_changes"
      ),
      text: this.hass!.localize(
        "ui.panel.lovelace.editor.edit_card.confirm_cancel"
      ),
      dismissText: this.hass!.localize("ui.common.stay"),
      confirmText: this.hass!.localize("ui.common.leave"),
    });
    if (confirm) {
      this._cancel();
    }
  }

  private _cancel(ev?: Event) {
    if (ev) {
      ev.stopPropagation();
    }
    this._dirty = false;
    this.closeDialog();
  }

  private async _save(): Promise<void> {
    if (!this._canSave) {
      return;
    }
    if (!this._dirty) {
      this.closeDialog();
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
    this._dirty = false;
    showSaveSuccessToast(this, this.hass);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
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
            --mdc-dialog-max-height: calc(100% - 72px);
          }
        }

        ha-dialog {
          --mdc-dialog-max-width: 845px;
          --dialog-z-index: 6;
        }

        @media all and (min-width: 451px) and (min-height: 501px) {
          ha-dialog {
            --mdc-dialog-max-width: 90vw;
          }
          :host([large]) .content {
            width: calc(90vw - 48px);
          }
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
            --dialog-surface-position: fixed;
            --dialog-surface-top: 40px;
            --mdc-dialog-max-height: calc(100% - 72px);
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
          height: max-content;
          background: var(--primary-background-color);
          padding: 4px;
          border-radius: 4px;
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
        .header_button {
          color: inherit;
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-card": HuiDialogEditCard;
  }
}
