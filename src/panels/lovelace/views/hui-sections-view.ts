import { ResizeController } from "@lit-labs/observers/resize-controller";
import {
  mdiDelete,
  mdiDrag,
  mdiEyeOff,
  mdiPencil,
  mdiViewGridPlus,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { clamp } from "../../../common/number/clamp";
import "../../../components/ha-icon-button";
import "../../../components/ha-ripple";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { LovelaceViewElement } from "../../../data/lovelace";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import type { HuiBadge } from "../badges/hui-badge";
import "../badges/hui-view-badges";
import type { HuiCard } from "../cards/hui-card";
import "../components/hui-badge-edit-mode";
import { addSection, deleteSection, moveSection } from "../editor/config-util";
import { findLovelaceContainer } from "../editor/lovelace-path";
import { showEditSectionDialog } from "../editor/section-editor/show-edit-section-dialog";
import type { HuiSection } from "../sections/hui-section";
import type { Lovelace } from "../types";

export const DEFAULT_MAX_COLUMNS = 4;

const parsePx = (value: string) => parseInt(value.replace("px", ""));

@customElement("hui-sections-view")
export class SectionsView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ type: Boolean }) public isStrategy = false;

  @property({ attribute: false }) public sections: HuiSection[] = [];

  @property({ attribute: false }) public badges: HuiBadge[] = [];

  @property({ attribute: false }) public cards: HuiCard[] = [];

  @state() private _config?: LovelaceViewConfig;

  @state() private _sectionColumnCount = 0;

  @state() _dragging = false;

  private _columnsController = new ResizeController(this, {
    callback: (entries) => {
      const totalWidth = entries[0]?.contentRect.width;

      if (!totalWidth) return 1;

      const style = getComputedStyle(this);
      const container = this.shadowRoot!.querySelector(".container")!;
      const containerStyle = getComputedStyle(container);

      const paddingLeft = parsePx(containerStyle.paddingLeft);
      const paddingRight = parsePx(containerStyle.paddingRight);
      const padding = paddingLeft + paddingRight;
      const minColumnWidth = parsePx(
        style.getPropertyValue("--column-min-width")
      );
      const columnGap = parsePx(containerStyle.columnGap);

      const columns = Math.floor(
        (totalWidth - padding + columnGap) / (minColumnWidth + columnGap)
      );
      const maxColumns = this._config?.max_columns ?? DEFAULT_MAX_COLUMNS;
      return clamp(columns, 1, maxColumns);
    },
  });

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
    this._sectionColumnCount = this.sections
      .filter((section) => !section.hidden)
      .map((section) => section.config.column_span ?? 1)
      .reduce((acc, val) => acc + val, 0);
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
    const totalSectionCount =
      this._sectionColumnCount + (this.lovelace?.editMode ? 1 : 0);
    const editMode = this.lovelace.editMode;

    const maxColumnCount = this._columnsController.value ?? 1;

    return html`
      <hui-view-badges
        .hass=${this.hass}
        .badges=${this.badges}
        .lovelace=${this.lovelace}
        .viewIndex=${this.index}
        style=${styleMap({
          "--max-column-count": maxColumnCount,
        })}
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
          class="container ${classMap({
            dense: Boolean(this._config?.dense_section_placement),
          })}"
          style=${styleMap({
            "--total-section-count": totalSectionCount,
            "--max-column-count": maxColumnCount,
          })}
        >
          ${repeat(
            sections,
            (section) => this._getSectionKey(section),
            (section, idx) => {
              const sectionConfig = this._config?.sections?.[idx];
              const columnSpan = Math.min(
                sectionConfig?.column_span || 1,
                maxColumnCount
              );

              const rowSpan = sectionConfig?.row_span || 1;

              return html`
                <div
                  class="section"
                  style=${styleMap({
                    "--column-span": columnSpan,
                    "--row-span": rowSpan,
                  })}
                >
                    ${
                      this.lovelace?.editMode
                        ? html`
                            <div class="section-header">
                              ${editMode
                                ? html`
                                    <div class="section-actions">
                                      <ha-svg-icon
                                        aria-hidden="true"
                                        class="handle"
                                        .path=${mdiDrag}
                                      ></ha-svg-icon>
                                      <ha-icon-button
                                        .label=${this.hass.localize(
                                          "ui.common.edit"
                                        )}
                                        @click=${this._editSection}
                                        .index=${idx}
                                        .path=${mdiPencil}
                                      ></ha-icon-button>
                                      <ha-icon-button
                                        .label=${this.hass.localize(
                                          "ui.common.delete"
                                        )}
                                        @click=${this._deleteSection}
                                        .index=${idx}
                                        .path=${mdiDelete}
                                      ></ha-icon-button>
                                    </div>
                                  `
                                : nothing}
                            </div>
                          `
                        : nothing
                    }
                    ${section}
                  </div>
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
                  <ha-ripple></ha-ripple>
                  <ha-svg-icon .path=${mdiViewGridPlus}></ha-svg-icon>
                </button>
              `
            : nothing}
          ${editMode && this._config?.cards?.length
            ? html`
                <div class="section imported-cards">
                  <div class="imported-card-header">
                    <p class="title">
                      <ha-svg-icon .path=${mdiEyeOff}></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.panel.lovelace.editor.section.imported_cards_title"
                      )}
                    </p>
                    <p class="subtitle">
                      ${this.hass.localize(
                        "ui.panel.lovelace.editor.section.imported_cards_description"
                      )}
                    </p>
                  </div>
                  <hui-section
                    .lovelace=${this.lovelace}
                    .hass=${this.hass}
                    .config=${this._importedCardSectionConfig(
                      this._config.cards
                    )}
                    .viewIndex=${this.index}
                    preview
                    import-only
                  ></hui-section>
                </div>
              `
            : nothing}
        </div>
      </ha-sortable>
    `;
  }

  private _importedCardSectionConfig = memoizeOne(
    (cards: LovelaceCardConfig[]) => ({
      type: "grid",
      cards,
    })
  );

  private _createSection(): void {
    const newConfig = addSection(this.lovelace!.config, this.index!, {
      type: "grid",
      cards: [
        {
          type: "heading",
          heading: this.hass!.localize(
            "ui.panel.lovelace.editor.section.default_section_title"
          ),
        },
      ],
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
        --column-gap: var(--ha-view-sections-column-gap, 32px);
        --column-max-width: var(--ha-view-sections-column-max-width, 500px);
        --column-min-width: var(--ha-view-sections-column-min-width, 320px);
        display: block;
      }

      @media (max-width: 600px) {
        :host {
          --column-gap: var(--row-gap);
        }
      }

      .container > * {
        position: relative;
        width: 100%;
      }

      .section {
        border-radius: var(--ha-card-border-radius, 12px);
        grid-column: span var(--column-span);
        grid-row: span var(--row-span);
      }

      .section:has(hui-section[hidden]) {
        display: none;
      }

      .container {
        --column-count: min(
          var(--max-column-count),
          var(--total-section-count)
        );
        display: grid;
        align-items: start;
        justify-content: center;
        grid-template-columns: repeat(var(--column-count), 1fr);
        grid-auto-flow: row;
        gap: var(--row-gap) var(--column-gap);
        padding: var(--row-gap) var(--column-gap);
        box-sizing: content-box;
        margin: 0 auto;
        max-width: calc(
          var(--column-count) * var(--column-max-width) +
            (var(--column-count) - 1) * var(--column-gap)
        );
      }
      .container.dense {
        grid-auto-flow: row dense;
      }

      .handle {
        cursor: grab;
        padding: 8px;
      }

      .create-section {
        margin-top: 36px;
        outline: none;
        background: none;
        cursor: pointer;
        border-radius: var(--ha-card-border-radius, 12px);
        border: 2px dashed var(--primary-color);
        order: 1;
        height: calc(var(--row-height) + 2 * (var(--row-gap) + 2px));
        padding: 8px;
        box-sizing: border-box;
        --ha-ripple-color: var(--primary-color);
        --ha-ripple-hover-opacity: 0.04;
        --ha-ripple-pressed-opacity: 0.12;
      }

      .create-section:focus {
        border: 2px solid var(--primary-color);
      }

      .sortable-ghost {
        border-radius: var(--ha-card-border-radius, 12px);
      }

      hui-view-badges {
        display: block;
        text-align: center;
        padding: 0 var(--column-gap);
        padding-top: var(--row-gap);
        margin: auto;
        max-width: calc(
          var(--max-column-count) * var(--column-max-width) +
            (var(--max-column-count) - 1) * var(--column-gap)
        );
      }

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

      .imported-cards {
        --column-span: var(--column-count);
        --row-span: 1;
        order: 2;
      }

      .imported-card-header {
        margin-top: 36px;
        padding: 32px 0 16px 0;
        border-top: 4px dotted var(--divider-color);
      }

      .imported-card-header .title {
        margin: 0;
        color: var(--primary-text-color);
        font-size: 16px;
        font-weight: 400;
        line-height: 24px;
        --mdc-icon-size: 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }
      .imported-card-header .subtitle {
        margin: 0;
        color: var(--secondary-text-color);
        font-size: 14px;
        font-weight: 400;
        line-height: 20px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sections-view": SectionsView;
  }
}
