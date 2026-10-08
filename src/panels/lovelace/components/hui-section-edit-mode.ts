import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiAutoFix,
  mdiContentCopy,
  mdiContentCut,
  mdiContentPaste,
  mdiDelete,
  mdiDotsVertical,
  mdiDragHorizontalVariant,
  mdiPencil,
  mdiPlusCircleMultipleOutline,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../../../common/decorators/storage";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { LovelaceSectionRawConfig } from "../../../data/lovelace/config/section";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { duplicateSection } from "../editor/config-util";
import type { LovelacePath } from "../editor/lovelace-path";
import {
  deleteAtPath,
  getAtPath,
  getParentPath,
  insertAtPath,
} from "../editor/lovelace-path";
import { showEditSectionDialog } from "../editor/section-editor/show-edit-section-dialog";
import type { Lovelace } from "../types";

@customElement("hui-section-edit-mode")
export class HuiSectionEditMode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public path!: LovelacePath;

  @property({ type: Boolean, attribute: "is-strategy", reflect: true })
  public isStrategy = false;

  // Session storage keeps a copied or cut section while switching views and
  // dashboards. Subscribing lets every section menu show Paste at once.
  @state()
  @storage({
    key: "dashboardSectionClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  private _clipboard?: LovelaceSectionRawConfig;

  protected render(): TemplateResult {
    return html`
      <div class="section-header">
        <div class="section-actions">
          ${
            this.isStrategy
              ? html`
                  <ha-svg-icon
                    id="strategy-icon"
                    .path=${mdiAutoFix}
                    role="img"
                    aria-label=${this.hass.localize(
                      "ui.panel.lovelace.editor.section.automatic"
                    )}
                  ></ha-svg-icon>
                  <ha-tooltip for="strategy-icon">
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.section.automatic"
                    )}
                  </ha-tooltip>
                `
              : nothing
          }
          <ha-svg-icon
            aria-hidden="true"
            class="handle"
            .path=${mdiDragHorizontalVariant}
          ></ha-svg-icon>
          <ha-dropdown
            placement="bottom-end"
            @wa-select=${this._handleDropdownSelect}
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-dropdown-item value="edit">
              <ha-svg-icon slot="icon" .path=${mdiPencil}></ha-svg-icon>
              ${this.hass.localize("ui.common.edit")}
            </ha-dropdown-item>
            <ha-dropdown-item value="duplicate">
              <ha-svg-icon
                slot="icon"
                .path=${mdiPlusCircleMultipleOutline}
              ></ha-svg-icon>
              ${this.hass.localize("ui.common.duplicate")}
            </ha-dropdown-item>
            <ha-dropdown-item value="copy">
              <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
              ${this.hass.localize("ui.common.copy")}
            </ha-dropdown-item>
            <ha-dropdown-item value="cut">
              <ha-svg-icon slot="icon" .path=${mdiContentCut}></ha-svg-icon>
              ${this.hass.localize("ui.panel.lovelace.editor.section.cut")}
            </ha-dropdown-item>
            ${
              this._clipboard
                ? html`
                    <ha-dropdown-item value="paste-above">
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiContentPaste}
                      ></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.panel.lovelace.editor.section.paste_above"
                      )}
                    </ha-dropdown-item>
                    <ha-dropdown-item value="paste-below">
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiContentPaste}
                      ></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.panel.lovelace.editor.section.paste_below"
                      )}
                    </ha-dropdown-item>
                  `
                : nothing
            }
            <wa-divider></wa-divider>
            <ha-dropdown-item value="delete" variant="danger">
              <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
              ${this.hass.localize("ui.common.delete")}
            </ha-dropdown-item>
          </ha-dropdown>
        </div>
      </div>
      <div class="section-wrapper">
        <div class="section-content" ?inert=${this.isStrategy}>
          <slot></slot>
        </div>
        ${
          this.isStrategy
            ? html`
                <button
                  class="edit-overlay"
                  type="button"
                  aria-label=${this.hass.localize(
                    "ui.panel.lovelace.editor.section.edit_automatic"
                  )}
                  @click=${this._editSection}
                >
                  <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                </button>
              `
            : nothing
        }
      </div>
    `;
  }

  private _handleDropdownSelect(ev: HaDropdownSelectEvent): void {
    const action = ev.detail?.item?.value;
    if (!action) return;
    switch (action) {
      case "edit":
        this._editSection();
        break;
      case "duplicate":
        this._duplicateSection();
        break;
      case "copy":
        this._copySection();
        break;
      case "cut":
        this._cutSection();
        break;
      case "paste-above":
        this._pasteSection(0);
        break;
      case "paste-below":
        this._pasteSection(1);
        break;
      case "delete":
        this._deleteSection();
        break;
    }
  }

  private async _editSection() {
    showEditSectionDialog(this, {
      lovelace: this.lovelace!,
      lovelaceConfig: this.lovelace!.config,
      saveConfig: (newConfig) => {
        this.lovelace!.saveConfig(newConfig);
      },
      path: this.path,
    });
  }

  private _duplicateSection(): void {
    const newConfig = duplicateSection(this.lovelace!.config, this.path);
    this.lovelace!.saveConfig(newConfig);
  }

  private _getSection(): LovelaceSectionRawConfig | undefined {
    return getAtPath<LovelaceSectionRawConfig>(
      this.lovelace!.config,
      this.path
    );
  }

  private _copySection(): void {
    const section = this._getSection();
    if (!section) return;
    this._clipboard = deepClone(section);
    this.lovelace!.showToast({
      message: this.hass.localize(
        "ui.panel.lovelace.editor.section.copied_to_clipboard"
      ),
    });
  }

  private async _cutSection(): Promise<void> {
    const section = this._getSection();
    if (!section) return;
    try {
      await this.lovelace!.saveConfig(
        deleteAtPath(this.lovelace!.config, this.path)
      );
    } catch (_err: unknown) {
      // The clipboard is only replaced once the section is gone, so a failed
      // cut does not turn into a copy.
      this.lovelace!.showToast({
        message: this.hass.localize(
          "ui.panel.lovelace.editor.section.cut_error"
        ),
      });
      return;
    }
    this._clipboard = deepClone(section);
    // Dashboards save every edit right away, unlike the automation editor, so
    // a cut section is only on the clipboard until it is pasted. Offer the
    // same undo as deleting a card.
    this.lovelace!.showToast({
      message: this.hass.localize(
        "ui.panel.lovelace.editor.section.cut_to_clipboard"
      ),
      duration: 8000,
      action: {
        action: () => fireEvent(window, "undo-change"),
        text: this.hass.localize("ui.common.undo"),
      },
    });
  }

  private async _pasteSection(offset: 0 | 1): Promise<void> {
    if (!this._clipboard) return;
    const index = this.path[this.path.length - 1] as number;
    try {
      await this.lovelace!.saveConfig(
        insertAtPath(
          this.lovelace!.config,
          [...getParentPath(this.path), index + offset],
          deepClone(this._clipboard)
        )
      );
    } catch (_err: unknown) {
      this.lovelace!.showToast({
        message: this.hass.localize(
          "ui.panel.lovelace.editor.section.paste_error"
        ),
      });
    }
  }

  private async _deleteSection() {
    const section = getAtPath<LovelaceSectionRawConfig>(
      this.lovelace!.config,
      this.path
    );

    const cardCount = section && "cards" in section && section.cards?.length;

    if (cardCount) {
      const confirm = await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.lovelace.editor.delete_section.title"
        ),
        text: this.hass.localize(
          `ui.panel.lovelace.editor.delete_section.text`
        ),
        confirmText: this.hass.localize("ui.common.delete"),
        destructive: true,
      });

      if (!confirm) return;
    }

    const newConfig = deleteAtPath(this.lovelace!.config, this.path);
    this.lovelace!.saveConfig(newConfig);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .section-header {
          position: relative;
          height: 34px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .section-actions {
          position: absolute;
          height: 36px;
          bottom: -2px;
          right: 0;
          inset-inline-end: 0;
          inset-inline-start: initial;
          opacity: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s ease-in-out;
          border-radius: var(
            --ha-section-border-radius,
            var(--ha-border-radius-xl)
          );
          border-bottom-left-radius: 0px;
          border-bottom-right-radius: 0px;
          background: var(--secondary-background-color);
          --ha-icon-button-size: 36px;
          --mdc-icon-size: 20px;
          color: var(--primary-text-color);
        }

        .handle {
          cursor: grab;
          padding: 8px;
        }

        #strategy-icon {
          padding: var(--ha-space-2);
        }

        .section-wrapper {
          position: relative;
          padding: 8px;
          border-radius: var(
            --ha-section-border-radius,
            var(--ha-border-radius-xl)
          );
          border-start-end-radius: 0;
          border: 2px dashed var(--divider-color);
          min-height: var(--row-height);
        }

        :host([is-strategy]) .section-wrapper {
          border-style: solid;
        }

        .section-content {
          position: relative;
          z-index: 0;
        }

        .edit-overlay {
          position: absolute;
          z-index: 0;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          border-radius: inherit;
          background: none;
          color: var(--primary-text-color);
          cursor: pointer;
          opacity: 0;
          transition: opacity var(--ha-animation-duration-fast) ease-in-out;
        }

        .edit-overlay::before {
          content: "";
          position: absolute;
          inset: 0;
          border: 1px solid var(--divider-color);
          border-radius: inherit;
          background: var(--primary-background-color);
          opacity: 0.8;
        }

        .edit-overlay:hover,
        .edit-overlay:focus-visible,
        .edit-overlay:active {
          opacity: 1;
        }

        .edit-overlay:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: -2px;
        }

        .edit-overlay ha-svg-icon {
          position: relative;
          padding: var(--ha-space-2);
          border-radius: var(--ha-border-radius-circle);
          background: var(--secondary-background-color);
          --mdc-icon-size: 20px;
        }

        @media (prefers-reduced-motion: reduce) {
          .edit-overlay {
            transition: none;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-edit-mode": HuiSectionEditMode;
  }
}
