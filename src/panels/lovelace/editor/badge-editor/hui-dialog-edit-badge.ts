import { mdiClose, mdiHelpCircle } from "@mdi/js";
import deepFreeze from "deep-freeze";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-spinner";
import "../../../../components/ha-button";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import { ensureBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import {
  getCustomBadgeEntry,
  isCustomType,
  stripCustomPrefix,
} from "../../../../data/lovelace_custom_cards";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";
import "../../badges/hui-badge";
import "../../sections/hui-section";
import { addBadge, replaceBadge } from "../config-util";
import { getBadgeDocumentationURL } from "../get-dashboard-documentation-url";
import type { ConfigChangedEvent } from "../hui-element-editor";
import { findLovelaceContainer } from "../lovelace-path";
import type { GUIModeChangedEvent } from "../types";
import "./hui-badge-element-editor";
import type { HuiBadgeElementEditor } from "./hui-badge-element-editor";
import type { EditBadgeDialogParams } from "./show-edit-badge-dialog";

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

@customElement("hui-dialog-edit-badge")
export class HuiDialogEditBadge
  extends LitElement
  implements HassDialog<EditBadgeDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public large = false;

  @state() private _params?: EditBadgeDialogParams;

  @state() private _badgeConfig?: LovelaceBadgeConfig;

  @state() private _containerConfig!: LovelaceViewConfig;

  @state() private _saving = false;

  @state() private _error?: string;

  @state() private _guiModeAvailable? = true;

  @query("hui-badge-element-editor")
  private _badgeEditorEl?: HuiBadgeElementEditor;

  @state() private _GUImode = true;

  @state() private _documentationURL?: string;

  @state() private _dirty = false;

  @state() private _isEscapeEnabled = true;

  public async showDialog(params: EditBadgeDialogParams): Promise<void> {
    this._params = params;
    this._GUImode = true;
    this._guiModeAvailable = true;

    const containerConfig = findLovelaceContainer(
      params.lovelaceConfig,
      params.path
    );

    if ("strategy" in containerConfig) {
      throw new Error("Can't edit strategy");
    }

    this._containerConfig = containerConfig;

    if ("badgeConfig" in params) {
      this._badgeConfig = params.badgeConfig;
      this._dirty = true;
    } else {
      const badge = this._containerConfig.badges?.[params.badgeIndex];
      this._badgeConfig = badge != null ? ensureBadgeConfig(badge) : badge;
    }

    this.large = false;
    if (this._badgeConfig && !Object.isFrozen(this._badgeConfig)) {
      this._badgeConfig = deepFreeze(this._badgeConfig);
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
    this._badgeConfig = undefined;
    this._error = undefined;
    this._documentationURL = undefined;
    this._dirty = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected updated(changedProps: PropertyValues): void {
    if (
      !this._badgeConfig ||
      this._documentationURL !== undefined ||
      !changedProps.has("_badgeConfig")
    ) {
      return;
    }

    const oldConfig = changedProps.get("_badgeConfig") as LovelaceBadgeConfig;

    if (oldConfig?.type !== this._badgeConfig!.type) {
      this._documentationURL = this._badgeConfig!.type
        ? getBadgeDocumentationURL(this.hass, this._badgeConfig!.type)
        : undefined;
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
    if (this._badgeConfig && this._badgeConfig.type) {
      let badgeName: string | undefined;
      if (isCustomType(this._badgeConfig.type)) {
        // prettier-ignore
        badgeName = getCustomBadgeEntry(
          stripCustomPrefix(this._badgeConfig.type)
        )?.name;
        // Trim names that end in " Card" so as not to redundantly duplicate it
        if (badgeName?.toLowerCase().endsWith(" badge")) {
          badgeName = badgeName.substring(0, badgeName.length - 6);
        }
      } else {
        badgeName = this.hass!.localize(
          `ui.panel.lovelace.editor.badge.${this._badgeConfig.type}.name`
        );
      }
      heading = this.hass!.localize(
        "ui.panel.lovelace.editor.edit_badge.typed_header",
        { type: badgeName }
      );
    } else if (!this._badgeConfig) {
      heading = this._containerConfig.title
        ? this.hass!.localize(
            "ui.panel.lovelace.editor.edit_badge.pick_badge_view_title",
            { name: this._containerConfig.title }
          )
        : this.hass!.localize("ui.panel.lovelace.editor.edit_badge.pick_badge");
    } else {
      heading = this.hass!.localize(
        "ui.panel.lovelace.editor.edit_badge.header"
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
            <hui-badge-element-editor
              .hass=${this.hass}
              .lovelace=${this._params.lovelaceConfig}
              .value=${this._badgeConfig}
              @config-changed=${this._handleConfigChanged}
              @GUImode-changed=${this._handleGUIModeChanged}
              @editor-save=${this._save}
              dialogInitialFocus
            ></hui-badge-element-editor>
          </div>
          <div class="element-preview">
            <hui-badge
              .hass=${this.hass}
              .config=${this._badgeConfig}
              preview
              class=${this._error ? "blur" : ""}
            ></hui-badge>
            ${this._error
              ? html`
                  <ha-spinner
                    size="small"
                    aria-label="Can't update badge"
                  ></ha-spinner>
                `
              : ``}
          </div>
        </div>
        ${this._badgeConfig !== undefined
          ? html`
              <ha-button
                appearance="plain"
                slot="secondaryAction"
                @click=${this._toggleMode}
                .disabled=${!this._guiModeAvailable}
                class="gui-mode-button"
              >
                ${this.hass!.localize(
                  !this._badgeEditorEl || this._GUImode
                    ? "ui.panel.lovelace.editor.edit_badge.show_code_editor"
                    : "ui.panel.lovelace.editor.edit_badge.show_visual_editor"
                )}
              </ha-button>
            `
          : nothing}
        <ha-button
          appearance="plain"
          slot="primaryAction"
          @click=${this._cancel}
          dialogInitialFocus
        >
          ${this.hass!.localize("ui.common.cancel")}
        </ha-button>
        ${this._badgeConfig !== undefined && this._dirty
          ? html`
              <ha-button
                slot="primaryAction"
                ?disabled=${!this._canSave || this._saving}
                @click=${this._save}
                .loading=${this._saving}
              >
                ${this.hass!.localize("ui.common.save")}
              </ha-button>
            `
          : nothing}
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
    this._badgeConfig = deepFreeze(ev.detail.config);
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
    this._badgeEditorEl?.toggleMode();
  }

  private _opened() {
    window.addEventListener("dialog-closed", this._enableEscapeKeyClose);
    window.addEventListener("hass-more-info", this._disableEscapeKeyClose);
    this._badgeEditorEl?.focusYamlEditor();
  }

  private get _canSave(): boolean {
    if (this._saving) {
      return false;
    }
    if (this._badgeConfig === undefined) {
      return false;
    }
    if (this._badgeEditorEl && this._badgeEditorEl.hasError) {
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
        "ui.panel.lovelace.editor.edit_badge.unsaved_changes"
      ),
      text: this.hass!.localize(
        "ui.panel.lovelace.editor.edit_badge.confirm_cancel"
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
      "badgeConfig" in this._params!
        ? addBadge(this._params!.lovelaceConfig, path, this._badgeConfig!)
        : replaceBadge(
            this._params!.lovelaceConfig,
            [...path, this._params!.badgeIndex],
            this._badgeConfig!
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
          padding: 10px;
          border-radius: var(--ha-border-radius-sm);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .element-preview ha-spinner {
          top: calc(50% - 14px);
          left: calc(50% - 14px);
          position: absolute;
          z-index: 10;
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
    "hui-dialog-edit-badge": HuiDialogEditBadge;
  }
}
