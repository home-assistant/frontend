import { mdiClose, mdiLinkVariant, mdiPlusBox } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import type { LovelaceSharedSectionConfig } from "../../../../data/lovelace/config/section";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import {
  addSection,
  addSectionRef,
  countSharedSectionRefs,
} from "../config-util";
import type { AddSectionDialogParams } from "./show-add-section-dialog";
import { generateDefaultSection } from "../../views/default-section";

@customElement("hui-dialog-add-section")
export class HuiDialogAddSection
  extends LitElement
  implements HassDialog<AddSectionDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: AddSectionDialogParams;

  @state() private _open = false;

  public async showDialog(params: AddSectionDialogParams): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._params) {
      return nothing;
    }

    const sharedSections = this._params.lovelaceConfig.shared_sections ?? [];

    return html`
      <ha-dialog .open=${this._open} @closed=${this._dialogClosed}>
        <ha-dialog-header show-border slot="header">
          <ha-icon-button
            slot="navigationIcon"
            @click=${this.closeDialog}
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">
            ${this.hass.localize("ui.panel.lovelace.editor.add_section.header")}
          </span>
        </ha-dialog-header>

        <div class="options">
          <!-- New section -->
          <button class="option-card" @click=${this._createNewSection}>
            <ha-svg-icon .path=${mdiPlusBox}></ha-svg-icon>
            <span class="option-label">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.add_section.new_section"
              )}
            </span>
          </button>
        </div>

        ${sharedSections.length > 0
          ? html`
              <div class="shared-section">
                <h3>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.add_section.use_shared_section"
                  )}
                </h3>
                <div class="shared-list">
                  ${sharedSections.map((section) =>
                    this._renderSharedOption(section)
                  )}
                </div>
              </div>
            `
          : html`
              <div class="empty-shared">
                <ha-svg-icon .path=${mdiLinkVariant}></ha-svg-icon>
                <p>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.add_section.no_shared_sections_yet"
                  )}
                </p>
                <span class="hint">
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.add_section.no_shared_sections_hint"
                  )}
                </span>
              </div>
            `}
      </ha-dialog>
    `;
  }

  private _renderSharedOption(
    section: LovelaceSharedSectionConfig
  ): TemplateResult {
    const label = this._getSectionLabel(section);
    const cardCount = section.cards?.length ?? 0;
    const refCount = countSharedSectionRefs(
      this._params!.lovelaceConfig,
      section.id
    );

    return html`
      <button
        class="shared-option"
        data-section-id=${section.id}
        @click=${this._insertSharedSection}
      >
        <ha-svg-icon .path=${mdiLinkVariant}></ha-svg-icon>
        <div class="shared-option-info">
          <span class="shared-option-name">${label}</span>
          <span class="shared-option-meta">
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
      </button>
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

  private _createNewSection(): void {
    if (!this._params) return;
    const newConfig = addSection(
      this._params.lovelaceConfig,
      this._params.viewIndex,
      generateDefaultSection(this.hass.localize, true)
    );
    this._params.saveConfig(newConfig);
    this.closeDialog();
  }

  private _insertSharedSection(ev: Event): void {
    if (!this._params) return;
    const sharedSectionId = (ev.currentTarget as HTMLElement).dataset
      .sectionId!;
    const newConfig = addSectionRef(
      this._params.lovelaceConfig,
      this._params.viewIndex,
      sharedSectionId
    );
    this._params.saveConfig(newConfig);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .options {
          display: flex;
          gap: var(--ha-space-2);
          padding: var(--ha-space-2) 0 var(--ha-space-4);
        }

        .option-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--ha-space-2);
          padding: var(--ha-space-4);
          background: var(--secondary-background-color);
          border: 2px solid var(--divider-color);
          border-radius: var(--ha-border-radius-l);
          cursor: pointer;
          transition:
            border-color 0.15s ease,
            background 0.15s ease;
          font-size: 1em;
          color: var(--primary-text-color);
        }

        .option-card:hover,
        .option-card:focus-visible {
          border-color: var(--primary-color);
          background: var(--card-background-color);
        }

        .option-card ha-svg-icon {
          --mdc-icon-size: 32px;
          color: var(--primary-color);
        }

        .option-label {
          font-weight: 500;
        }

        .shared-section h3 {
          margin: 0 0 var(--ha-space-2);
          font-size: 0.85em;
          font-weight: 500;
          color: var(--secondary-text-color);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .shared-list {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-1);
        }

        .shared-option {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          padding: var(--ha-space-2) var(--ha-space-3);
          background: var(--secondary-background-color);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-m);
          cursor: pointer;
          width: 100%;
          text-align: start;
          color: var(--primary-text-color);
          font-size: 1em;
          transition: background 0.15s ease;
        }

        .shared-option:hover,
        .shared-option:focus-visible {
          background: var(--card-background-color);
        }

        .shared-option ha-svg-icon {
          color: var(--primary-color);
          flex-shrink: 0;
        }

        .shared-option-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .shared-option-name {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .shared-option-meta {
          font-size: 0.85em;
          color: var(--secondary-text-color);
        }

        .empty-shared {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--ha-space-1);
          padding: var(--ha-space-4);
          background: var(--secondary-background-color);
          border-radius: var(--ha-border-radius-l);
          color: var(--secondary-text-color);
          text-align: center;
        }

        .empty-shared ha-svg-icon {
          --mdc-icon-size: 24px;
        }

        .empty-shared p {
          margin: 0;
          font-weight: 500;
        }

        .hint {
          font-size: 0.85em;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-add-section": HuiDialogAddSection;
  }
}
