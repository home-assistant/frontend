import "@material/mwc-list";
import "@material/web/divider/divider";
import {
  mdiCheck,
  mdiClose,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiOpenInNew,
} from "@mdi/js";
import deepFreeze from "deep-freeze";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-button-menu-new";
import "../../../../components/ha-circular-progress";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-menu-item";
import { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";
import "../../cards/hui-card";
import { computeCardName } from "../../common/compute-card-name";
import "../../sections/hui-section";
import { addCard, replaceCard } from "../config-util";
import { getCardDocumentationURL } from "../get-dashboard-documentation-url";
import type { ConfigChangedEvent } from "../hui-element-editor";
import { findLovelaceContainer } from "../lovelace-path";
import type { GUIModeChangedEvent } from "../types";
import "./hui-card-editor";
import type { HuiCardElementEditor } from "./hui-card-element-editor";
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

  @state() private _containerConfig!:
    | LovelaceViewConfig
    | LovelaceSectionConfig;

  @state() private _saving = false;

  @state() private _error?: string;

  @query("hui-card-editor")
  private _cardEditorEl?: HuiCardElementEditor;

  @state() private _yamlMode = true;

  @state() private _documentationURL?: string;

  @state() private _dirty = false;

  @state() private _isEscapeEnabled = true;

  public async showDialog(params: EditCardDialogParams): Promise<void> {
    this._params = params;
    this._yamlMode = true;
    this._guiModeAvailable = true;

    const containerConfig = findLovelaceContainer(
      params.lovelaceConfig,
      params.path
    );

    if ("strategy" in containerConfig) {
      throw new Error("Can't edit strategy");
    }

    this._containerConfig = containerConfig;

    if ("cardConfig" in params) {
      this._cardConfig = params.cardConfig;
      this._dirty = true;
    } else {
      this._cardConfig = this._containerConfig.cards?.[params.cardIndex];
    }

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
      const cardName = computeCardName(this._cardConfig, this.hass!.localize);
      heading = this.hass!.localize(
        "ui.panel.lovelace.editor.edit_card.typed_header",
        { type: cardName }
      );
    } else if (!this._cardConfig) {
      heading = this._containerConfig.title
        ? this.hass!.localize(
            "ui.panel.lovelace.editor.edit_card.pick_card_view_title",
            { name: this._containerConfig.title }
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
          <ha-button-menu-new
            slot="actionItems"
            anchor-corner="end-end"
            menu-corner="start-end"
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            >
            </ha-icon-button>
            <ha-menu-item @click=${this._enableGuiMode}>
              ${!this._yamlMode
                ? html`
                    <ha-svg-icon
                      class="selected_menu_item"
                      slot="start"
                      .path=${mdiCheck}
                    ></ha-svg-icon>
                  `
                : html`<span class="blank-icon" slot="start"></span>`}
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_card.edit_ui"
                )}
              </div>
            </ha-menu-item>
            <ha-menu-item @click=${this._enableYamlMode}>
              ${this._yamlMode
                ? html`
                    <ha-svg-icon
                      class="selected_menu_item"
                      slot="start"
                      .path=${mdiCheck}
                    ></ha-svg-icon>
                  `
                : html`<span class="blank-icon" slot="start"></span>`}
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_card.edit_yaml"
                )}
              </div>
            </ha-menu-item>
            ${this._documentationURL !== undefined
              ? html`
                  <md-divider role="separator" tabindex="-1"></md-divider>
                  <ha-menu-item
                    type="link"
                    href=${this._documentationURL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ha-svg-icon
                      slot="start"
                      .path=${mdiHelpCircle}
                    ></ha-svg-icon>
                    <div slot="headline">
                      ${this.hass!.localize("ui.panel.lovelace.menu.help")}
                    </div>
                    <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
                  </ha-menu-item>
                `
              : nothing}
          </ha-button-menu-new>
        </ha-dialog-header>
        <div class="content">
          <div class="element-editor">
            <hui-card-editor
              .containerConfig=${this._containerConfig}
              .hass=${this.hass}
              .lovelace=${this._params.lovelaceConfig}
              .config=${this._cardConfig}
              @config-changed=${this._handleConfigChanged}
              @GUImode-changed=${this._handleGUIModeChanged}
              @editor-save=${this._save}
              dialogInitialFocus
            >
            </hui-card-editor>
          </div>
          <div class="element-preview">
            ${this._isInSection
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
              ? html`
                  <ha-circular-progress
                    indeterminate
                    aria-label="Can't update card"
                  ></ha-circular-progress>
                `
              : ``}
          </div>
        </div>
        <ha-button
          @click=${this._cancel}
          slot="secondaryAction"
          dialogInitialFocus
        >
          ${this.hass!.localize("ui.common.cancel")}
        </ha-button>
        ${this._cardConfig !== undefined && this._dirty
          ? html`
              <ha-button
                slot="primaryAction"
                ?disabled=${!this._canSave || this._saving}
                @click=${this._save}
              >
                ${this._saving
                  ? html`
                      <ha-circular-progress
                        indeterminate
                        aria-label="Saving"
                        size="small"
                      ></ha-circular-progress>
                    `
                  : this.hass!.localize("ui.common.save")}
              </ha-button>
            `
          : nothing}
      </ha-dialog>
    `;
  }

  private _enableGuiMode() {
    this._yamlMode = false;
  }

  private _enableYamlMode() {
    this._yamlMode = true;
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
    this._yamlMode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _opened() {
    window.addEventListener("dialog-closed", this._enableEscapeKeyClose);
    window.addEventListener("hass-more-info", this._disableEscapeKeyClose);
    // this._cardEditorEl?.focusYamlEditor();
  }

  private get _isInSection() {
    return this._params!.path.length === 2;
  }

  private _cardConfigInSection = memoizeOne(
    (cardConfig?: LovelaceCardConfig) => {
      const { cards, title, ...containerConfig } = this
        ._containerConfig as LovelaceSectionConfig;

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
    const path = this._params!.path;
    await this._params!.saveConfig(
      "cardConfig" in this._params!
        ? addCard(this._params!.lovelaceConfig, path, this._cardConfig!)
        : replaceCard(
            this._params!.lovelaceConfig,
            [...path, this._params!.cardIndex],
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
        }
        .element-preview ha-circular-progress {
          top: 50%;
          left: 50%;
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
        .selected_menu_item {
          color: var(--primary-color);
        }
        .blank-icon {
          width: 16px;
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
