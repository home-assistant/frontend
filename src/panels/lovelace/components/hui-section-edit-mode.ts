import { mdiDelete, mdiDrag, mdiPencil } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-button-menu";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { deleteSection } from "../editor/config-util";
import { findLovelaceContainer } from "../editor/lovelace-path";
import { showEditSectionDialog } from "../editor/section-editor/show-edit-section-dialog";
import type { Lovelace } from "../types";

@customElement("hui-section-edit-mode")
export class HuiSectionEditMode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false, type: Number }) public index!: number;

  @property({ attribute: false, type: Number }) public viewIndex!: number;

  protected render(): TemplateResult {
    return html`
      <div class="section-header">
        <div class="section-actions">
          <ha-svg-icon
            aria-hidden="true"
            class="handle"
            .path=${mdiDrag}
          ></ha-svg-icon>
          <ha-icon-button
            .label=${this.hass.localize("ui.common.edit")}
            @click=${this._editSection}
            .path=${mdiPencil}
          ></ha-icon-button>
          <ha-icon-button
            .label=${this.hass.localize("ui.common.delete")}
            @click=${this._deleteSection}
            .path=${mdiDelete}
          ></ha-icon-button>
        </div>
      </div>
      <div class="section-wrapper">
        <slot></slot>
      </div>
    `;
  }

  private async _editSection(ev) {
    ev.stopPropagation();
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

  private async _deleteSection(ev) {
    ev.stopPropagation();
    const path = [this.viewIndex, this.index] as [number, number];

    const section = findLovelaceContainer(this.lovelace!.config, path);

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
          border-radius: var(--ha-card-border-radius, 12px);
          border-bottom-left-radius: 0px;
          border-bottom-right-radius: 0px;
          background: var(--secondary-background-color);
          --mdc-icon-button-size: 36px;
          --mdc-icon-size: 20px;
          color: var(--primary-text-color);
        }

        .handle {
          cursor: grab;
          padding: 8px;
        }

        .section-wrapper {
          padding: 8px;
          border-radius: var(--ha-card-border-radius, 12px);
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
