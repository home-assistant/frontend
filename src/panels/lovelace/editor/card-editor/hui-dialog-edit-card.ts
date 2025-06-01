import { mdiClose, mdiHelpCircle } from "@mdi/js";
import deepFreeze from "deep-freeze";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import "../../../../components/ha-spinner";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import {
  getCustomCardEntry,
  isCustomType,
  stripCustomPrefix,
} from "../../../../data/lovelace_custom_cards";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";
import "../../cards/hui-card";
import "../../sections/hui-section";
import { getCardDocumentationURL } from "../get-dashboard-documentation-url";
import type { ConfigChangedEvent } from "../hui-element-editor";
import type { GUIModeChangedEvent } from "../types";
import "./hui-card-element-editor";
import type { HuiCardElementEditor } from "./hui-card-element-editor";
import type { EditCardDialogParams } from "./show-edit-card-dialog";
import { tryCreateCardElement } from "../../create-element/create-card-element";

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

  @state() private _sectionConfig?: LovelaceSectionConfig;

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

    this._sectionConfig = this._params.sectionConfig;

    this._cardConfig = params.cardConfig;
    this._dirty = Boolean(this._params.isNew);

    this.large = false;
    if (this._cardConfig && !Object.isFrozen(this._cardConfig)) {
      this._cardConfig = deepFreeze(this._cardConfig);
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
    if (!this._cardConfig || !changedProps.has("_cardConfig")) {
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
    if (!this._params || !this._cardConfig) {
      return nothing;
    }

    let heading: string;
    if (this._cardConfig.type) {
      let cardName: string | undefined;
      if (isCustomType(this._cardConfig.type)) {
        // prettier-ignore
        cardName = getCustomCardEntry(
          stripCustomPrefix(this._cardConfig.type)
        )?.name;
        // Trim names that end in " Card" so as not to redundantly duplicate it
        if (cardName?.toLowerCase().endsWith(" card")) {
          cardName = cardName.substring(0, cardName.length - 5);
        }
      } else {
        cardName = this.hass!.localize(
          `ui.panel.lovelace.editor.card.${this._cardConfig.type}.name`
        );
      }
      heading = this.hass!.localize(
        "ui.panel.lovelace.editor.edit_card.typed_header",
        { type: cardName }
      );
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
              .showVisibilityTab=${this._cardConfig.type !== "conditional"}
              .sectionConfig=${this._sectionConfig}
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
            ${this._cardConfigOutView(this._cardConfig)
              ? html`<ha-alert
                  alert-type="error"
                  .title=${this.hass?.localize(
                    "ui.errors.config.configuration_error"
                  )}
                >
                  ${this._cardConfigOutView(this._cardConfig)}
                </ha-alert>`
              : nothing}
            ${this._sectionConfig
              ? html`
                  <hui-section
                    .hass=${this.hass}
                    .config=${this._cardConfigInSection(this._cardConfig)}
                    preview
                    class=${this._error ? "blur" : ""}
                  ></hui-section>
                `
              : html`
                  <hui-card
                    .hass=${this.hass}
                    .config=${this._cardConfig}
                    preview
                    class=${this._error ? "blur" : ""}
                  ></hui-card>
                `}
            ${this._error
              ? html` <ha-spinner aria-label="Can't update card"></ha-spinner> `
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
                        <ha-spinner
                          aria-label="Saving"
                          size="small"
                        ></ha-spinner>
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

  private _cardConfigOutView = memoizeOne((cardConfig: LovelaceCardConfig) => {
    try {
      tryCreateCardElement(cardConfig);
      return nothing;
    } catch (err: any) {
      this._error = err.message;
      return err.message;
    }
  });

  private _cardConfigInSection = memoizeOne(
    (cardConfig: LovelaceCardConfig) => {
      const { cards, title, ...containerConfig } = this
        ._sectionConfig as LovelaceSectionConfig;

      return {
        ...containerConfig,
        cards: cardConfig ? [cardConfig] : [],
      };
    }
  );

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
    try {
      await this._params!.saveCardConfig(this._cardConfig!);
      this._saving = false;
      this._dirty = false;
      showSaveSuccessToast(this, this.hass);
      this.closeDialog();
    } catch (err: any) {
      showToast(this, {
        message: err.message,
      });
      this._saving = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        :host {
          --code-mirror-max-height: calc(100vh - 176px);
        }

        ha-dialog {
          --mdc-dialog-max-width: 100px;
          --dialog-z-index: 6;
          --dialog-surface-position: fixed;
          --dialog-surface-top: 40px;
          --mdc-dialog-max-width: 90vw;
          --dialog-content-padding: 24px 12px;
        }

        .content {
          width: calc(90vw - 48px);
          max-width: 1000px;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-dialog {
            height: 100%;
            --mdc-dialog-max-height: 100%;
            --dialog-surface-top: 0px;
            --mdc-dialog-max-width: 100vw;
          }
          .content {
            width: 100%;
            max-width: 100%;
          }
        }

        @media all and (min-width: 451px) and (min-height: 501px) {
          :host([large]) .content {
            max-width: none;
          }
        }

        .center {
          margin-left: auto;
          margin-right: auto;
        }

        .content {
          display: flex;
          flex-direction: column;
        }

        .content hui-card {
          display: block;
          padding: 4px;
          margin: 0 auto;
          max-width: 390px;
        }
        .content hui-section {
          display: block;
          padding: 4px;
          margin: 0 auto;
          max-width: var(--ha-view-sections-column-max-width, 500px);
        }
        .content .element-editor {
          margin: 0 10px;
        }

        @media (min-width: 1000px) {
          .content {
            flex-direction: row;
          }
          .content > * {
            flex-basis: 0;
            flex-grow: 1;
            flex-shrink: 1;
            min-width: 0;
          }
          .content hui-card {
            padding: 8px 10px;
            margin: auto 0px;
            max-width: 500px;
          }
          .content hui-section {
            padding: 8px 10px;
            margin: auto 0px;
            max-width: var(--ha-view-sections-column-max-width, 500px);
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
          position: sticky;
          top: 0;
        }
        .element-preview ha-spinner {
          top: calc(50% - 24px);
          left: calc(50% - 24px);
          position: absolute;
          z-index: 10;
        }
        hui-card {
          padding-top: 8px;
          margin-bottom: 4px;
          display: block;
          width: 100%;
          box-sizing: border-box;
        }
        .gui-mode-button {
          margin-right: auto;
          margin-inline-end: auto;
          margin-inline-start: initial;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        ha-dialog-header a {
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
