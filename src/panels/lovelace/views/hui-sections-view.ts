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
import { addSection, deleteSection, moveSection } from "../editor/config-util";
import { findLovelaceContainer } from "../editor/lovelace-path";
import { showEditSectionDialog } from "../editor/section-editor/show-edit-section-dialog";
import { HuiSection } from "../sections/hui-section";
import type { Lovelace, LovelaceBadge } from "../types";

@customElement("hui-sections-view")
export class SectionsView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ type: Boolean }) public isStrategy = false;

  @property({ attribute: false }) public sections: HuiSection[] = [];

  @property({ attribute: false }) public badges: LovelaceBadge[] = [];

  @state() private _config?: LovelaceViewConfig;

  @state() private _sectionCount = 0;

  public setConfig(config: LovelaceViewConfig): void {
    this._config = config;
  }

  private _sectionConfigKeys = new WeakMap<HuiSection, string>();

  private _getKey(sectionConfig: HuiSection) {
    if (!this._sectionConfigKeys.has(sectionConfig)) {
      this._sectionConfigKeys.set(sectionConfig, Math.random().toString());
    }
    return this._sectionConfigKeys.get(sectionConfig)!;
  }

  private _computeSectionsCount() {
    this._sectionCount = this.sections.filter(
      (section) => !section.hidden
    ).length;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("section-visibility-changed", () => {
      this._computeSectionsCount();
    });
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
      ${this.badges.length > 0
        ? html`<div class="badges">${this.badges}</div>`
        : ""}
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
            (section) => this._getKey(section),
            (section, idx) => {
              (section as any).itemPath = [idx];
              return html`
                <div class="section">
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
                  class="create"
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
        --row-gap: var(--ha-view-sections-row-gap, 8px);
        --column-gap: var(--ha-view-sections-column-gap, 32px);
        --column-min-width: var(--ha-view-sections-column-min-width, 320px);
        --column-max-width: var(--ha-view-sections-column-max-width, 500px);
        display: block;
      }

      .badges {
        margin: 4px 0;
        padding: var(--row-gap) var(--column-gap);
        padding-bottom: 0;
        font-size: 85%;
        text-align: center;
      }

      .container > * {
        position: relative;
        max-width: var(--column-max-width);
        width: 100%;
      }

      .section {
        border-radius: var(--ha-card-border-radius, 12px);
      }

      .section:not(:has(> *:not([hidden]))) {
        display: none;
      }

      .container {
        --max-count: min(var(--total-count), var(--max-columns-count, 4));
        --max-width: min(
          calc(
            (var(--max-count) + 1) * var(--column-min-width) +
              (var(--max-count) + 2) * var(--column-gap) - 1px
          ),
          calc(
            var(--max-count) * var(--column-max-width) + (var(--max-count) + 1) *
              var(--column-gap)
          )
        );
        display: grid;
        align-items: start;
        justify-items: center;
        grid-template-columns: repeat(
          auto-fit,
          minmax(min(var(--column-min-width), 100%), 1fr)
        );
        gap: var(--row-gap) var(--column-gap);
        padding: var(--row-gap) var(--column-gap);
        box-sizing: border-box;
        max-width: var(--max-width);
        margin: 0 auto;
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

      .create {
        margin-top: calc(66px + var(--row-gap));
        outline: none;
        background: none;
        cursor: pointer;
        border-radius: var(--ha-card-border-radius, 12px);
        border: 2px dashed var(--primary-color);
        order: 1;
        height: calc(66px + 2 * (var(--row-gap) + 2px));
        padding: 8px;
        box-sizing: border-box;
      }

      .create:focus {
        border: 2px solid var(--primary-color);
      }

      .sortable-ghost {
        border-radius: var(--ha-card-border-radius, 12px);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sections-view": SectionsView;
  }
}
