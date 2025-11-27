import { ResizeController } from "@lit-labs/observers/resize-controller";
import { mdiEyeOff, mdiViewGridPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
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
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { HuiBadge } from "../badges/hui-badge";
import type { HuiCard } from "../cards/hui-card";
import "../components/hui-badge-edit-mode";
import "../components/hui-section-edit-mode";
import { addSection, moveCard, moveSection } from "../editor/config-util";
import type { LovelaceCardPath } from "../editor/lovelace-path";
import {
  findLovelaceItems,
  getLovelaceContainerPath,
  parseLovelaceCardPath,
} from "../editor/lovelace-path";
import type { HuiSection } from "../sections/hui-section";
import type { Lovelace } from "../types";
import "./hui-view-header";
import "./hui-view-sidebar";

export const DEFAULT_MAX_COLUMNS = 4;

const parsePx = (value: string) => parseInt(value.replace("px", ""));

@customElement("hui-sections-view")
export class SectionsView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ attribute: false }) public isStrategy = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public sections: HuiSection[] = [];

  @property({ attribute: false }) public cards: HuiCard[] = [];

  @property({ attribute: false }) public badges: HuiBadge[] = [];

  @state() private _config?: LovelaceViewConfig;

  @state() private _sectionColumnCount = 0;

  @state() _dragging = false;

  @state() private _showSidebar = false;

  private _contentScrollTop = 0;

  private _sidebarScrollTop = 0;

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
    this._showSidebar = Boolean(window.history.state?.sidebar);
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
      this._sectionColumnCount +
      (this.lovelace?.editMode ? 1 : 0) +
      (this._config?.sidebar ? 1 : 0);
    const editMode = this.lovelace.editMode;

    const maxColumnCount = this._columnsController.value ?? 1;

    const columnCount = Math.min(maxColumnCount, totalSectionCount);
    // On mobile with sidebar, use full width for whichever view is active
    const contentColumnCount =
      this._config?.sidebar && !this.narrow
        ? Math.max(1, columnCount - 1)
        : columnCount;

    return html`
      <div
        class="wrapper ${classMap({
          "top-margin": Boolean(this._config?.top_margin),
          "has-sidebar": Boolean(this._config?.sidebar),
          narrow: this.narrow,
        })}"
        style=${styleMap({
          "--column-count": columnCount,
          "--content-column-count": contentColumnCount,
        })}
      >
        <hui-view-header
          .hass=${this.hass}
          .badges=${this.badges}
          .lovelace=${this.lovelace}
          .viewIndex=${this.index}
          .config=${this._config?.header}
        ></hui-view-header>
        ${this.narrow && this._config?.sidebar
          ? html`
              <div class="mobile-tabs">
                <ha-control-select
                  .value=${this._showSidebar ? "sidebar" : "content"}
                  @value-changed=${this._viewChanged}
                  .options=${[
                    {
                      value: "content",
                      label: this._config.sidebar.content_label,
                    },
                    {
                      value: "sidebar",
                      label: this._config.sidebar.sidebar_label,
                    },
                  ]}
                >
                </ha-control-select>
              </div>
            `
          : nothing}
        <div class="container">
          <ha-sortable
            .disabled=${!editMode}
            @item-moved=${this._sectionMoved}
            group="section"
            handle-selector=".handle"
            draggable-selector=".section"
            .rollback=${false}
          >
            <div
              class="content ${classMap({
                dense: Boolean(this._config?.dense_section_placement),
                "mobile-hidden": this.narrow && this._showSidebar,
              })}"
            >
              ${repeat(
                sections,
                (section) => this._getSectionKey(section),
                (section, idx) => {
                  const columnSpan = Math.min(
                    section.config.column_span || 1,
                    contentColumnCount
                  );
                  const rowSpan = section.config.row_span || 1;

                  return html`
                <div
                  class="section"
                  style=${styleMap({
                    "--column-span": columnSpan,
                    "--row-span": rowSpan,
                  })}
                >
                    ${
                      editMode
                        ? html`
                            <hui-section-edit-mode
                              .hass=${this.hass}
                              .lovelace=${this.lovelace}
                              .index=${idx}
                              .viewIndex=${this.index}
                            >
                              ${section}
                            </hui-section-edit-mode>
                          `
                        : section
                    }
                  </div>
                </div>
              `;
                }
              )}
              ${editMode
                ? html`
                    <ha-sortable
                      group="card"
                      @item-added=${this._handleCardAdded}
                      draggable-selector=".card"
                      .rollback=${false}
                    >
                      <div class="create-section-container">
                        <div class="drop-helper" aria-hidden="true">
                          <p>
                            ${this.hass.localize(
                              "ui.panel.lovelace.editor.section.drop_card_create_section"
                            )}
                          </p>
                        </div>
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
                      </div>
                    </ha-sortable>
                  `
                : nothing}
            </div>
          </ha-sortable>
          ${this._config?.sidebar
            ? html`
                <hui-view-sidebar
                  class=${classMap({
                    "mobile-hidden": this.narrow && !this._showSidebar,
                  })}
                  .hass=${this.hass}
                  .badges=${this.badges}
                  .lovelace=${this.lovelace}
                  .viewIndex=${this.index}
                  .config=${this._config.sidebar}
                ></hui-view-sidebar>
              `
            : nothing}
        </div>
        <div class="imported-cards-section">
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
      </div>
    `;
  }

  private _defaultSection(includeHeading: boolean): LovelaceSectionConfig {
    return {
      type: "grid",
      cards: includeHeading
        ? [
            {
              type: "heading",
              heading: this.hass!.localize(
                "ui.panel.lovelace.editor.section.default_section_title"
              ),
            },
          ]
        : [],
    };
  }

  private _handleCardAdded(ev) {
    const { data } = ev.detail;
    const oldPath = data as LovelaceCardPath;

    const { cardIndex } = parseLovelaceCardPath(oldPath);
    const containerPath = getLovelaceContainerPath(oldPath);
    const cards = findLovelaceItems(
      "cards",
      this.lovelace!.config,
      containerPath
    );
    const cardConfig = cards![cardIndex];

    const configWithNewSection = addSection(
      this.lovelace!.config,
      this.index!,
      this._defaultSection(cardConfig.type !== "heading") // If we move a heading card, we don't want to include a heading in the new section
    );
    const viewConfig = configWithNewSection.views[
      this.index!
    ] as LovelaceViewConfig;
    const newPath = [
      this.index!,
      viewConfig.sections!.length - 1,
      1,
    ] as LovelaceCardPath;
    const newConfig = moveCard(configWithNewSection, oldPath, newPath);
    this.lovelace!.saveConfig(newConfig);
  }

  private _importedCardSectionConfig = memoizeOne(
    (cards: LovelaceCardConfig[]) => ({
      type: "grid",
      cards,
    })
  );

  private _createSection(): void {
    const newConfig = addSection(
      this.lovelace!.config,
      this.index!,
      this._defaultSection(true)
    );
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

  private _viewChanged(ev: CustomEvent) {
    const newValue = ev.detail.value;
    const shouldShowSidebar = newValue === "sidebar";

    if (shouldShowSidebar !== this._showSidebar) {
      this._toggleView();
    }
  }

  private _toggleView() {
    // Save current scroll position
    if (this._showSidebar) {
      this._sidebarScrollTop = window.scrollY;
    } else {
      this._contentScrollTop = window.scrollY;
    }

    this._showSidebar = !this._showSidebar;

    // Add sidebar state to history
    window.history.replaceState(
      { ...window.history.state, sidebar: this._showSidebar },
      ""
    );

    // Restore scroll position after view updates
    this.updateComplete.then(() => {
      const scrollY = this._showSidebar
        ? this._sidebarScrollTop
        : this._contentScrollTop;
      window.scrollTo(0, scrollY);
    });
  }

  static styles = css`
    :host {
      --row-height: var(--ha-view-sections-row-height, 56px);
      --row-gap: var(--ha-view-sections-row-gap, 8px);
      --column-gap: var(--ha-view-sections-column-gap, 32px);
      --column-max-width: var(--ha-view-sections-column-max-width, 500px);
      --column-min-width: var(--ha-view-sections-column-min-width, 320px);
      --top-margin: var(--ha-view-sections-extra-top-margin, 80px);
      display: block;
    }

    @media (max-width: 600px) {
      :host {
        --column-gap: var(--ha-view-sections-narrow-column-gap, var(--row-gap));
      }
    }

    .wrapper {
      display: block;
      padding: var(--row-gap) var(--column-gap);
      box-sizing: content-box;
      margin: 0 auto;
      max-width: calc(
        var(--column-count) * var(--column-max-width) +
          (var(--column-count) - 1) * var(--column-gap)
      );
    }

    .wrapper.top-margin {
      margin-top: var(--top-margin);
    }

    .section {
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      grid-column: span var(--column-span);
      grid-row: span var(--row-span);
    }

    .section:has(hui-section[hidden]) {
      display: none;
    }

    .container {
      display: grid;
      grid-template-columns: [content-start] repeat(
          var(--content-column-count),
          1fr
        );
      gap: var(--row-gap) var(--column-gap);
      padding: var(--row-gap) 0;
    }

    .wrapper.has-sidebar .container {
      grid-template-columns:
        [content-start] repeat(var(--content-column-count), 1fr)
        [sidebar-start] 1fr;
    }

    /* On mobile with sidebar, content and sidebar both take full width */
    .wrapper.narrow.has-sidebar .container {
      grid-template-columns: 1fr;
    }

    hui-view-sidebar {
      grid-column: sidebar-start / -1;
    }

    .wrapper.narrow hui-view-sidebar {
      grid-column: 1 / -1;
      padding-bottom: calc(
        var(--ha-space-4) + 56px + var(--ha-space-4) +
          env(safe-area-inset-bottom)
      );
    }

    .mobile-hidden {
      display: none !important;
    }

    .mobile-tabs {
      position: fixed;
      bottom: calc(var(--ha-space-3) + env(safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%);
      padding: 0;
      z-index: 1;
    }

    .mobile-tabs ha-control-select {
      width: max-content;
      min-width: 280px;
      max-width: 90%;
      --control-select-thickness: var(--ha-space-14);
      --control-select-border-radius: var(--ha-border-radius-pill);
      --control-select-background: var(--card-background-color);
      --control-select-background-opacity: 1;
      --control-select-color: var(--primary-color);
      --control-select-padding: 6px;
      box-shadow: rgba(0, 0, 0, 0.3) 0px 4px 10px 0px;
    }

    ha-sortable {
      display: contents;
    }

    .content {
      grid-column: content-start / sidebar-start;
      grid-row: 1 / -1;
      display: grid;
      align-items: start;
      justify-content: center;
      grid-template-columns: repeat(var(--content-column-count), 1fr);
      grid-auto-flow: row;
      gap: var(--row-gap) var(--column-gap);
    }

    .wrapper.narrow .content {
      grid-column: 1 / -1;
    }

    .wrapper.narrow.has-sidebar .content {
      padding-bottom: calc(
        var(--ha-space-4) + 56px + var(--ha-space-4) +
          env(safe-area-inset-bottom)
      );
    }

    .content.dense {
      grid-auto-flow: row dense;
    }

    .create-section-container {
      position: relative;
      display: flex;
      flex-direction: column;
      margin-top: 36px;
    }

    .create-section-container .card {
      display: none;
    }

    .create-section-container:has(.card) .drop-helper {
      display: flex;
    }
    .create-section-container:has(.card) .create-section {
      display: none;
    }

    .drop-helper {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      outline: none;
      background: none;
      cursor: pointer;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      border: 2px dashed var(--primary-color);
      height: calc(var(--row-height) + 2 * (var(--row-gap) + 2px));
      padding: 8px;
      box-sizing: border-box;
      width: 100%;
      --ha-ripple-color: var(--primary-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
    }

    .drop-helper p {
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-normal);
      text-align: center;
    }

    .create-section {
      display: block;
      position: relative;
      outline: none;
      background: none;
      cursor: pointer;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      border: 2px dashed var(--primary-color);
      order: 1;
      height: calc(var(--row-height) + 2 * (var(--row-gap) + 2px));
      padding: 8px;
      box-sizing: border-box;
      width: 100%;
      --ha-ripple-color: var(--primary-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
    }

    .create-section:focus {
      border: 2px solid var(--primary-color);
    }

    .sortable-ghost {
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
    }

    hui-view-header {
      display: block;
      padding-top: var(--row-gap);
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
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-normal);
      --mdc-icon-size: 18px;
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
      margin-bottom: 8px;
    }
    .imported-card-header .subtitle {
      margin: 0;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sections-view": SectionsView;
  }
}
