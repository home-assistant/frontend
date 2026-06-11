import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiDelete,
  mdiDotsVertical,
  mdiDragHorizontalVariant,
  mdiLinkOff,
  mdiLinkVariant,
  mdiPencil,
  mdiPlusCircleMultipleOutline,
  mdiShareVariant,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import {
  deleteSection,
  duplicateSection,
  getSharedSection,
  promoteToSharedSection,
} from "../editor/config-util";
import {
  findLovelaceContainer,
  updateLovelaceContainer,
} from "../editor/lovelace-path";
import { isSectionRef } from "../../../data/lovelace/config/section";
import { showEditSectionDialog } from "../editor/section-editor/show-edit-section-dialog";
import type { Lovelace } from "../types";

@customElement("hui-section-edit-mode")
export class HuiSectionEditMode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public index!: number;

  @property({ attribute: false }) public viewIndex!: number;

  protected render(): TemplateResult {
    const section = findLovelaceContainer(this.lovelace.config, [
      this.viewIndex,
      this.index,
    ]);
    const isRef = isSectionRef(section);

    return html`
      <div class="section-header">
        <div class="section-actions">
          <ha-svg-icon
            aria-hidden="true"
            class="handle"
            .path=${mdiDragHorizontalVariant}
          ></ha-svg-icon>
          ${isRef
            ? html`<ha-svg-icon
                aria-label=${this.hass.localize(
                  "ui.panel.lovelace.editor.section.shared_indicator"
                )}
                class="shared-indicator"
                .path=${mdiLinkVariant}
              ></ha-svg-icon>`
            : nothing}
          <ha-dropdown
            placement="bottom-end"
            @wa-select=${this._handleDropdownSelect}
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-dropdown-item value=${isRef ? "edit-shared" : "edit"}>
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
            ${isRef
              ? html`
                  <ha-dropdown-item value="unlink">
                    <ha-svg-icon slot="icon" .path=${mdiLinkOff}></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.section.unlink_section"
                    )}
                  </ha-dropdown-item>
                `
              : html`
                  <ha-dropdown-item value="share">
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiShareVariant}
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.section.share_section"
                    )}
                  </ha-dropdown-item>
                `}
            <wa-divider></wa-divider>
            <ha-dropdown-item value="delete" variant="danger">
              <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
              ${this.hass.localize("ui.common.delete")}
            </ha-dropdown-item>
          </ha-dropdown>
        </div>
      </div>
      <div class="section-wrapper">
        <slot></slot>
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
      case "edit-shared":
        this._editSharedSection();
        break;
      case "duplicate":
        this._duplicateSection();
        break;
      case "share":
        this._shareSection();
        break;
      case "unlink":
        this._unlinkSection();
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
      viewIndex: this.viewIndex,
      sectionIndex: this.index,
    });
  }

  private async _editSharedSection() {
    showEditSectionDialog(this, {
      lovelace: this.lovelace!,
      lovelaceConfig: this.lovelace!.config,
      saveConfig: (newConfig) => {
        this.lovelace!.saveConfig(newConfig);
      },
      viewIndex: this.viewIndex,
      sectionIndex: this.index,
      editSharedDefinition: true,
    });
  }

  private _duplicateSection(): void {
    const newConfig = duplicateSection(
      this.lovelace!.config,
      this.viewIndex,
      this.index
    );
    this.lovelace!.saveConfig(newConfig);
  }

  private _shareSection(): void {
    const newConfig = promoteToSharedSection(
      this.lovelace!.config,
      this.viewIndex,
      this.index
    );
    this.lovelace!.saveConfig(newConfig);
  }

  private _unlinkSection(): void {
    const section = findLovelaceContainer(this.lovelace.config, [
      this.viewIndex,
      this.index,
    ]);
    if (!isSectionRef(section)) return;

    const sharedDef = getSharedSection(
      this.lovelace.config,
      section.section_ref
    );

    // Deep-clone the shared definition and apply layout overrides from the ref
    const concreteSection = {
      ...(sharedDef ? deepClone(sharedDef) : { type: "grid", cards: [] }),
      ...(section.column_span !== undefined && {
        column_span: section.column_span,
      }),
      ...(section.row_span !== undefined && { row_span: section.row_span }),
    };

    // Remove the shared-section id field — it belongs only in shared_sections
    if ("id" in concreteSection) {
      delete (concreteSection as { id?: string }).id;
    }

    const newConfig = updateLovelaceContainer(
      this.lovelace.config,
      [this.viewIndex, this.index],
      concreteSection
    );
    this.lovelace!.saveConfig(newConfig);
  }

  private async _deleteSection() {
    const path = [this.viewIndex, this.index] as [number, number];

    const section = findLovelaceContainer(this.lovelace!.config, path);

    // For ref sections just remove the reference — no card-count prompt needed
    if (!isSectionRef(section)) {
      const cardCount = "cards" in section && section.cards?.length;
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
    }

    const newConfig = deleteSection(
      this.lovelace!.config,
      this.viewIndex,
      this.index
    );
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

        .shared-indicator {
          padding: 8px;
          color: var(--primary-color);
          --mdc-icon-size: 16px;
        }

        .section-wrapper {
          padding: 8px;
          border-radius: var(
            --ha-section-border-radius,
            var(--ha-border-radius-xl)
          );
          border-start-end-radius: 0;
          border: 2px dashed var(--divider-color);
          min-height: var(--row-height);
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
