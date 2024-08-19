import { mdiArrowAll, mdiDelete, mdiPencil, mdiViewGridPlus } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import "../../../components/ha-icon-button";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { LovelaceViewElement } from "../../../data/lovelace";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { HuiBadge } from "../badges/hui-badge";
import "../badges/hui-view-badges";
import "../components/hui-badge-edit-mode";
import { addSection, deleteSection, moveSection } from "../editor/config-util";
import { findLovelaceContainer } from "../editor/lovelace-path";
import { showEditSectionDialog } from "../editor/section-editor/show-edit-section-dialog";
import { HuiSection } from "../sections/hui-section";
import type { Lovelace } from "../types";

export const BREAKPOINTS: Record<string, number> = {
  "0": 1,
  "768": 2,
  "1280": 3,
  "1600": 4,
  "1920": 5,
  "2560": 6,
};

@customElement("hui-sections-view")
export class SectionsView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ type: Boolean }) public isStrategy = false;

  @property({ attribute: false }) public sections: HuiSection[] = [];

  @property({ attribute: false }) public badges: HuiBadge[] = [];

  @state() private _config?: LovelaceViewConfig;

  @state() private _sectionCount = 0;

  @state() _dragging = false;

  public setConfig(config: LovelaceViewConfig): void {
    this._config = config;
  }

  private _sectionConfigKeys = new WeakMap<HuiSection, string>();

  private _getSectionKey(section: HuiSection) {
    if (!this._sectionConfigKeys.has(section)) {
      this._sectionConfigKeys.set(section, Math.random().toString());
    }
    return this._sectionConfigKeys.get(section)!;
  }

  private _computeSectionsCount() {
    this._sectionCount = this.sections.filter(
      (section) => !section.hidden
    ).length;
  }

  private _sectionVisibilityChanged = () => {
    this._computeSectionsCount();
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(
      "section-visibility-changed",
      this._sectionVisibilityChanged
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener(
      "section-visibility-changed",
      this._sectionVisibilityChanged
    );
  }

  willUpdate(changedProperties: PropertyValues<typeof this>): void {
    if (changedProperties.has("sections")) {
      this._computeSectionsCount();
    }
  }

  protected render() {
    if (!this.lovelace) return nothing;

    const sections = this.sections;
    const totalCount = this._sectionCount + (this.lovelace?.editMode ? 1 : 0);
    const editMode = this.lovelace.editMode;

    const maxColumnsCount = this._config?.max_columns;

    return html`
      <hui-view-badges
        .hass=${this.hass}
        .badges=${this.badges}
        .lovelace=${this.lovelace}
        .viewIndex=${this.index}
      ></hui-view-badges>
      <ha-sortable
        .disabled=${!editMode}
        @item-moved=${this._sectionMoved}
        group="section"
        handle-selector=".handle"
        draggable-selector=".section"
        .rollback=${false}
      >
        <div
          class="container"
          style=${styleMap({
            "--max-columns-count": maxColumnsCount,
            "--total-count": totalCount,
          })}
        >
          ${repeat(
            sections,
            (section) => this._getSectionKey(section),
            (section, idx) => {
              const sectionConfig = this._config?.sections?.[idx];
              const columnSpan = sectionConfig?.column_span || 1;

              (section as any).itemPath = [idx];

              return html`
                <div
                  class="section"
                  style=${styleMap({
                    "--column-span": columnSpan,
                  })}
                >
                  ${editMode
                    ? html`
                        <div class="section-overlay">
                          <div class="section-actions">
                            <ha-svg-icon
                              aria-hidden="true"
                              class="handle"
                              .path=${mdiArrowAll}
                            ></ha-svg-icon>
                            <ha-icon-button
                              .label=${this.hass.localize("ui.common.edit")}
                              @click=${this._editSection}
                              .index=${idx}
                              .path=${mdiPencil}
                            ></ha-icon-button>
                            <ha-icon-button
                              .label=${this.hass.localize("ui.common.delete")}
                              @click=${this._deleteSection}
                              .index=${idx}
                              .path=${mdiDelete}
                            ></ha-icon-button>
                          </div>
                        </div>
                      `
                    : nothing}
                  ${section}
                </div>
              `;
            }
          )}
          ${editMode
            ? html`
                <button
                  class="create-section"
                  @click=${this._createSection}
                  aria-label=${this.hass.localize(
                    "ui.panel.lovelace.editor.section.create_section"
                  )}
                  .title=${this.hass.localize(
                    "ui.panel.lovelace.editor.section.create_section"
                  )}
                >
                  <ha-svg-icon .path=${mdiViewGridPlus}></ha-svg-icon>
                </button>
              `
            : nothing}
        </div>
      </ha-sortable>
    `;
  }

  private _createSection(): void {
    const newConfig = addSection(this.lovelace!.config, this.index!, {
      type: "grid",
      cards: [],
    });
    this.lovelace!.saveConfig(newConfig);
  }

  private async _editSection(ev) {
    const index = ev.currentTarget.index;

    showEditSectionDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      saveConfig: (newConfig) => {
        this.lovelace!.saveConfig(newConfig);
      },
      viewIndex: this.index!,
      sectionIndex: index,
    });
  }

  private async _deleteSection(ev) {
    const index = ev.currentTarget.index;

    const path = [this.index!, index] as [number, number];

    const section = findLovelaceContainer(this.lovelace!.config, path);

    const title = section.title?.trim();
    const cardCount = "cards" in section && section.cards?.length;

    if (title || cardCount) {
      const named = title ? "named" : "unnamed";
      const type = cardCount ? "cards" : "only";

      const confirm = await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.lovelace.editor.delete_section.title"
        ),
        text: this.hass.localize(
          `ui.panel.lovelace.editor.delete_section.text_${named}_section_${type}`,
          { name: title }
        ),
        confirmText: this.hass.localize("ui.common.delete"),
        destructive: true,
      });

      if (!confirm) return;
    }

    const newConfig = deleteSection(this.lovelace!.config, this.index!, index);
    this.lovelace!.saveConfig(newConfig);
  }

  private _sectionMoved(ev: CustomEvent) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const newConfig = moveSection(
      this.lovelace!.config,
      [this.index!, oldIndex],
      [this.index!, newIndex]
    );
    this.lovelace!.saveConfig(newConfig);
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --row-height: var(--ha-view-sections-row-height, 56px);
        --row-gap: var(--ha-view-sections-row-gap, 8px);
        --column-gap: var(--ha-view-sections-column-gap, 24px);
        --column-min-width: var(--ha-view-sections-column-min-width, 320px);
        --column-max-width: var(--ha-view-sections-column-max-width, 500px);
        display: block;
      }

      :host {
        --column-count: 1;
      }
      @media (min-width: 768px) {
        :host {
          --column-count: 2;
        }
      }
      @media (min-width: 1280px) {
        :host {
          --column-count: 3;
        }
      }
      @media (min-width: 1600px) {
        :host {
          --column-count: 4;
        }
      }
      @media (min-width: 1920px) {
        :host {
          --column-count: 5;
        }
      }
      @media (min-width: 2560px) {
        :host {
          --column-count: 6;
        }
      }

      .container > * {
        position: relative;
        width: 100%;
      }

      .section {
        --section-column-span: min(var(--column-span, 1), var(--column-count));
        border-radius: var(--ha-card-border-radius, 12px);
        grid-column: span var(--section-column-span);
      }

      .section:not(:has(> *:not([hidden]))) {
        display: none;
      }

      .container {
        --section-count: min(var(--column-count), var(--total-count));
        display: grid;
        align-items: start;
        justify-content: center;
        grid-template-columns: repeat(var(--section-count), 1fr);
        gap: var(--row-gap) var(--column-gap);
        padding: var(--row-gap) var(--column-gap);
        box-sizing: content-box;
        margin: 0 auto;
        max-width: calc(
          var(--section-count) * var(--column-max-width) +
            (var(--column-count) - 1) * var(--column-gap)
        );
      }

      @media (max-width: 600px) {
        .container {
          --column-gap: var(--row-gap);
        }
      }

      .section-actions {
        position: absolute;
        top: 0;
        right: 0;
        inset-inline-end: 0;
        inset-inline-start: initial;
        opacity: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s ease-in-out;
        background-color: rgba(var(--rgb-card-background-color), 0.3);
        border-radius: 18px;
        background: var(--secondary-background-color);
        --mdc-icon-button-size: 36px;
        --mdc-icon-size: 20px;
        color: var(--primary-text-color);
      }

      .handle {
        cursor: grab;
        padding: 8px;
      }

      .create-section {
        margin-top: calc(var(--row-height) + var(--row-gap));
        outline: none;
        background: none;
        cursor: pointer;
        border-radius: var(--ha-card-border-radius, 12px);
        border: 2px dashed var(--primary-color);
        order: 1;
        height: calc(var(--row-height) + 2 * (var(--row-gap) + 2px));
        padding: 8px;
        box-sizing: border-box;
      }

      .create-section:focus {
        border: 2px solid var(--primary-color);
      }

      .sortable-ghost {
        border-radius: var(--ha-card-border-radius, 12px);
      }

      hui-view-badges {
        display: block;
        margin: 16px 8px;
        text-align: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sections-view": SectionsView;
  }
}
