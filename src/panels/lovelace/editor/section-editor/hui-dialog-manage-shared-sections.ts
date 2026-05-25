import { mdiClose, mdiDelete, mdiPencil } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-button-toggle";
import "../../../../components/ha-list-item";
import "../../../../components/ha-svg-icon";
import type { LovelaceSharedSectionConfig } from "../../../../data/lovelace/config/section";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { countSharedSectionRefs, deleteSharedSection } from "../config-util";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { showEditSectionDialog } from "./show-edit-section-dialog";
import type { ManageSharedSectionsDialogParams } from "./show-manage-shared-sections-dialog";
import type { Lovelace } from "../../types";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";

@customElement("hui-dialog-manage-shared-sections")
export class HuiDialogManageSharedSections
  extends LitElement
  implements HassDialog<ManageSharedSectionsDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ManageSharedSectionsDialogParams;

  @state() private _open = false;

  @state() private _lovelaceConfig?: LovelaceConfig;

  @state() private _lovelace?: Lovelace;

  public async showDialog(
    params: ManageSharedSectionsDialogParams
  ): Promise<void> {
    this._params = params;
    this._lovelace = params.lovelace;
    this._lovelaceConfig = params.lovelaceConfig;
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._lovelaceConfig = undefined;
    this._lovelace = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._params || !this._lovelaceConfig) {
      return nothing;
    }

    const sharedSections = this._lovelaceConfig.shared_sections ?? [];

    return html`
      <ha-dialog
        .open=${this._open}
        @closed=${this._dialogClosed}
        .heading=${this.hass.localize(
          "ui.panel.lovelace.editor.manage_shared_sections.header"
        )}
      >
        <ha-dialog-header show-border slot="header">
          <ha-icon-button
            slot="navigationIcon"
            @click=${this.closeDialog}
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">
            ${this.hass.localize(
              "ui.panel.lovelace.editor.manage_shared_sections.header"
            )}
          </span>
        </ha-dialog-header>

        ${sharedSections.length === 0
          ? html`
              <div class="empty-state">
                <p>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.manage_shared_sections.no_shared_sections"
                  )}
                </p>
              </div>
            `
          : html`
              <div class="sections-list">
                ${sharedSections.map((section) =>
                  this._renderSharedSection(section)
                )}
              </div>
            `}

        <ha-button slot="primaryAction" @click=${this.closeDialog}>
          ${this.hass.localize("ui.common.close")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _renderSharedSection(
    section: LovelaceSharedSectionConfig
  ): TemplateResult {
    const refCount = countSharedSectionRefs(this._lovelaceConfig!, section.id);
    const cardCount = section.cards?.length ?? 0;
    const label = this._getSectionLabel(section);

    return html`
      <div class="section-row">
        <div class="section-info">
          <span class="section-name">${label}</span>
          <span class="section-meta">
            ${this.hass.localize(
              "ui.panel.lovelace.editor.manage_shared_sections.cards_count",
              { count: cardCount }
            )}
            ·
            ${this.hass.localize(
              "ui.panel.lovelace.editor.manage_shared_sections.used_in_views",
              { count: refCount }
            )}
          </span>
        </div>
        <div class="section-actions">
          <ha-icon-button
            .label=${this.hass.localize("ui.common.edit")}
            .path=${mdiPencil}
            data-section-id=${section.id}
            @click=${this._editSharedSectionClick}
          ></ha-icon-button>
          <ha-icon-button
            .label=${this.hass.localize("ui.common.delete")}
            .path=${mdiDelete}
            class="danger"
            data-section-id=${section.id}
            @click=${this._deleteSharedSectionClick}
          ></ha-icon-button>
        </div>
      </div>
    `;
  }

  private _getSectionLabel(section: LovelaceSharedSectionConfig): string {
    const headingCard = section.cards?.find((c) => c.type === "heading");
    if (headingCard && "heading" in headingCard && headingCard.heading) {
      return String(headingCard.heading);
    }
    return this.hass.localize(
      "ui.panel.lovelace.editor.manage_shared_sections.unnamed_section",
      { id: section.id.slice(0, 8) }
    );
  }

  private _editSharedSectionClick(ev: Event): void {
    const id = (ev.currentTarget as HTMLElement).dataset.sectionId!;
    const section = this._lovelaceConfig?.shared_sections?.find(
      (s) => s.id === id
    );
    if (section) this._editSharedSection(section);
  }

  private _deleteSharedSectionClick(ev: Event): void {
    const id = (ev.currentTarget as HTMLElement).dataset.sectionId!;
    const section = this._lovelaceConfig?.shared_sections?.find(
      (s) => s.id === id
    );
    if (section) this._deleteSharedSection(section);
  }

  private _editSharedSection(section: LovelaceSharedSectionConfig): void {
    if (!this._params || !this._lovelace || !this._lovelaceConfig) return;

    // Find the first, at least I think it's good we have the first "master"
    for (let vi = 0; vi < this._lovelaceConfig.views.length; vi++) {
      const view = this._lovelaceConfig.views[vi];
      if ("strategy" in view || !view.sections) continue;
      for (let si = 0; si < view.sections.length; si++) {
        const s = view.sections[si];
        if ("section_ref" in s && s.section_ref === section.id) {
          showEditSectionDialog(this, {
            lovelace: this._lovelace,
            lovelaceConfig: this._lovelaceConfig,
            saveConfig: (newConfig) => {
              this._lovelaceConfig = newConfig;
              this._params!.saveConfig(newConfig);
            },
            viewIndex: vi,
            sectionIndex: si,
            editSharedDefinition: true,
          });
          return;
        }
      }
    }

    this.hass.connection.sendMessagePromise({
      type: "lovelace/config/save",
    });
  }

  private async _deleteSharedSection(
    section: LovelaceSharedSectionConfig
  ): Promise<void> {
    if (!this._params || !this._lovelaceConfig) return;

    const refCount = countSharedSectionRefs(this._lovelaceConfig, section.id);

    if (refCount > 0) {
      const confirmed = await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.lovelace.editor.manage_shared_sections.delete_title"
        ),
        text: this.hass.localize(
          "ui.panel.lovelace.editor.manage_shared_sections.delete_warning",
          { count: refCount }
        ),
        confirmText: this.hass.localize("ui.common.delete"),
        destructive: true,
      });
      if (!confirmed) return;
    }

    const newConfig = deleteSharedSection(this._lovelaceConfig, section.id);
    this._lovelaceConfig = newConfig;
    this._params.saveConfig(newConfig);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .sections-list {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-1);
          padding: var(--ha-space-2) 0;
        }

        .section-row {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          padding: var(--ha-space-2) var(--ha-space-4);
          border-radius: var(--ha-border-radius-m);
          background: var(--secondary-background-color);
        }

        .section-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .section-name {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .section-meta {
          font-size: 0.85em;
          color: var(--secondary-text-color);
        }

        .section-actions {
          display: flex;
          align-items: center;
          gap: var(--ha-space-1);
        }

        .danger {
          color: var(--error-color);
        }

        .empty-state {
          text-align: center;
          color: var(--secondary-text-color);
          padding: var(--ha-space-6) var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-manage-shared-sections": HuiDialogManageSharedSections;
  }
}
