import { ResizeController } from "@lit-labs/observers/resize-controller";
import { ContextProvider } from "@lit/context";
import { mdiEyeOff, mdiViewGridPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { clamp } from "../../../common/number/clamp";
import { getHistoryState, updateHistoryState } from "../../../common/navigate";
import "../../../components/ha-icon-button";
import "../../../components/ha-ripple";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import { maxColumnsContext } from "../common/context";
import type { LovelaceViewElement } from "../../../data/lovelace";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
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
import "../sections/hui-section-background";
import type { Lovelace } from "../types";
import { generateDefaultSection } from "./default-section";
import "./hui-view-footer";
import "./hui-view-header";
import "./hui-view-sidebar";
import { computeSectionsBackgroundAlignment } from "./sections-background-alignment";
import { computeCompactLayout } from "./sections-compact-layout";
import type { CompactRow } from "./sections-compact-layout";
import { measureSectionFootprint } from "./sections-compact-measurement";
import { waitForSectionRender } from "./sections-compact-readiness";

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

  private _maxColumns = 0;

  private _contentColumnCount = 1;

  private _compactEligible = false;

  @state() private _compactLayout?: CompactRow[];

  private _compactLayoutColumnCount?: number;

  private _compactLayoutGeneration = 0;

  private _compactLayoutPending = false;

  private _compactFrame?: number;

  private _compactReadyController?: AbortController;

  @query(".content") private _content?: HTMLDivElement;

  @queryAll(".content > .section > .section-container")
  private _nativeSectionContainers!: NodeListOf<HTMLDivElement>;

  private _maxColumnsProvider = new ContextProvider(this, {
    context: maxColumnsContext,
  });

  @state() _dragging = false;

  @state() private _sidebarTabActive = false;

  @state() private _sidebarVisible = true;

  private _contentScrollTop = 0;

  private _sidebarScrollTop = 0;

  private _columnsController = new ResizeController(this, {
    callback: (entries) => {
      const totalWidth = entries[0]?.contentRect.width;

      if (!totalWidth) return 1;

      const style = getComputedStyle(this);
      const wrapper = this.shadowRoot!.querySelector(".wrapper")!;
      const wrapperStyle = getComputedStyle(wrapper);
      const container = this.shadowRoot!.querySelector(".container")!;
      const containerStyle = getComputedStyle(container);

      const paddingLeft = parsePx(wrapperStyle.paddingLeft);
      const paddingRight = parsePx(wrapperStyle.paddingRight);
      const padding = paddingLeft + paddingRight;
      const minColumnWidth = parsePx(
        style.getPropertyValue("--column-min-width")
      );
      const columnGap = parsePx(containerStyle.columnGap);

      const columns = Math.floor(
        (totalWidth - padding + columnGap) / (minColumnWidth + columnGap)
      );
      return Math.max(columns, 1);
    },
  });

  public setConfig(config: LovelaceViewConfig): void {
    // setConfig is the configuration-edit boundary, not an entity update.
    if (this._config?.sections !== config.sections) {
      this._invalidateCompactLayout();
    }
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
    this._sidebarTabActive = Boolean(getHistoryState()?.sidebar);
    this.requestUpdate();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._invalidateCompactLayout();
    this.removeEventListener(
      "section-visibility-changed",
      this._sectionVisibilityChanged
    );
  }

  willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("sections")) {
      this._computeSectionsCount();
      const previous = changedProperties.get("sections");
      if (
        !previous ||
        previous.length !== this.sections.length ||
        previous.some((section, index) => section !== this.sections[index])
      ) {
        this._invalidateCompactLayout();
      }
    }
    this._updateMaxColumnCount();
    const { contentColumnCount } = this._columnCounts();
    this._contentColumnCount = contentColumnCount;
    const eligible = Boolean(
      this.lovelace &&
      this._config?.compact_section_placement === true &&
      !this.lovelace.editMode &&
      contentColumnCount > 1 &&
      this.sections.every((section) => (section.config.row_span ?? 1) === 1)
    );
    if (
      eligible !== this._compactEligible ||
      (this._compactLayoutColumnCount !== undefined &&
        this._compactLayoutColumnCount !== contentColumnCount)
    ) {
      this._invalidateCompactLayout();
    }
    this._compactEligible = eligible;
  }

  private _updateMaxColumnCount(): void {
    // The column count is clamped here instead of in the resize callback, so
    // that it follows the config of the view the element is currently used for
    const maxColumns = this._config?.max_columns ?? DEFAULT_MAX_COLUMNS;
    const maxColumnCount = clamp(
      this._columnsController.value ?? 1,
      1,
      maxColumns
    );

    if (maxColumnCount !== this._maxColumns) {
      this._maxColumns = maxColumnCount;
      this._maxColumnsProvider.setValue(maxColumnCount);
    }
  }

  private _columnCounts() {
    const editMode = this.lovelace?.editMode;
    const hasSidebar =
      this._config?.sidebar && (this._sidebarVisible || editMode);
    const totalSectionCount =
      this._sectionColumnCount + (editMode ? 1 : 0) + (hasSidebar ? 1 : 0);
    const columnCount = Math.max(
      Math.min(this._maxColumns, totalSectionCount),
      1
    );
    return {
      columnCount,
      contentColumnCount: hasSidebar
        ? Math.max(1, columnCount - 1)
        : columnCount,
    };
  }

  private _invalidateCompactLayout() {
    this._compactLayoutGeneration++;
    this._compactReadyController?.abort();
    this._compactReadyController = undefined;
    if (this._compactFrame !== undefined) {
      cancelAnimationFrame(this._compactFrame);
    }
    this._compactFrame = undefined;
    this._compactLayoutPending = false;
    this._compactLayout = undefined;
    this._compactLayoutColumnCount = undefined;
  }

  protected updated() {
    if (
      !this.isConnected ||
      !this._compactEligible ||
      this._compactLayout ||
      this._compactLayoutPending
    ) {
      return;
    }

    const generation = this._compactLayoutGeneration;
    const columnCount = this._contentColumnCount;
    this._compactLayoutColumnCount = columnCount;
    this._compactLayoutPending = true;
    const controller = new AbortController();
    this._compactReadyController = controller;
    void this.updateComplete.then(async () => {
      await waitForSectionRender(this.sections, controller.signal);
      if (!this.isConnected || generation !== this._compactLayoutGeneration) {
        return;
      }
      this._compactReadyController = undefined;
      this._compactFrame = requestAnimationFrame(() => {
        if (!this.isConnected || generation !== this._compactLayoutGeneration) {
          return;
        }
        this._compactFrame = undefined;

        // Read all dimensions before calculating or installing any layout state.
        // During measurement, all plain containers carry alignment margins. The
        // pure helper uses them only for the actual compact row's top peers.
        const containers = this._nativeSectionContainers;
        const measurements = this.sections.map((section, index) => {
          const footprint = section.hidden
            ? { height: 0, margin: 0 }
            : measureSectionFootprint(containers[index]);
          return {
            index,
            columnSpan: section.config.column_span,
            rowSpan: section.config.row_span,
            height: footprint.height - footprint.margin,
            alignmentMargin: footprint.margin,
            hasBackground: section.config.background !== undefined,
            hidden: Boolean(section.hidden),
          };
        });
        const rowGap = parseFloat(getComputedStyle(this._content!).rowGap) || 0;
        this._compactLayout = computeCompactLayout(
          measurements,
          columnCount,
          rowGap
        );
        this._compactLayoutPending = false;
      });
    });
  }

  private _renderCompactRows() {
    return repeat(
      this._compactLayout!,
      (row) =>
        this._getSectionKey(this.sections[row.lanes[0].sectionIndices[0]]),
      (row) => html`
        <div class="compact-row">
          ${repeat(
            row.lanes,
            (lane) => lane.columnStart,
            (lane) => html`
              <div
                class="compact-lane"
                style=${styleMap({
                  "grid-column": `${lane.columnStart} / span ${lane.columnSpan}`,
                })}
              >
                ${repeat(
                  lane.sectionIndices,
                  (index) => this._getSectionKey(this.sections[index]),
                  (index) => html`
                    <div
                      class="section"
                      style=${styleMap({
                        "--column-span": lane.columnSpan,
                        "--row-span": 1,
                      })}
                    >
                      ${this._renderSection(
                        this.sections[index],
                        row.alignedSectionIndices.includes(index)
                      )}
                    </div>
                  `
                )}
              </div>
            `
          )}
        </div>
      `
    );
  }

  protected render() {
    if (!this.lovelace) return nothing;

    const sections = this.sections;
    const editMode = this.lovelace.editMode;
    const hasSidebar =
      this._config?.sidebar && (this._sidebarVisible || editMode);
    const singleColumn = this._maxColumns <= 1;

    // The tab switcher is opt-in: a sidebar enables it by labelling both tabs,
    // otherwise the sidebar stacks below the content.
    const useSidebarTabs = Boolean(
      singleColumn &&
      hasSidebar &&
      this._config?.sidebar?.content_label &&
      this._config?.sidebar?.sidebar_label
    );

    const { columnCount, contentColumnCount } = this._columnCounts();

    const sectionNeedsMargin = computeSectionsBackgroundAlignment(
      sections,
      contentColumnCount
    );

    return html`
      <div
        class="wrapper ${classMap({
          "top-margin": Boolean(this._config?.top_margin),
          "has-sidebar": Boolean(hasSidebar),
          "single-column": singleColumn,
          "has-sidebar-tabs": useSidebarTabs,
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
        ${
          useSidebarTabs
            ? html`
                <div class="sidebar-tabs">
                  <ha-control-select
                    .value=${this._sidebarTabActive ? "sidebar" : "content"}
                    @value-changed=${this._viewChanged}
                    .options=${[
                      {
                        value: "content",
                        label: this._config!.sidebar!.content_label,
                      },
                      {
                        value: "sidebar",
                        label: this._config!.sidebar!.sidebar_label,
                      },
                    ]}
                  >
                  </ha-control-select>
                </div>
              `
            : nothing
        }
        <div class="container">
          <ha-sortable
            .disabled=${!editMode}
            @item-moved=${this._sectionMoved}
            group="section"
            handle-selector=".handle"
            draggable-selector=".section"
          >
            <div
              class="content ${classMap({
                dense:
                  !this._compactEligible &&
                  Boolean(this._config?.dense_section_placement),
                compact: Boolean(this._compactLayout),
                hidden: useSidebarTabs && this._sidebarTabActive,
              })}"
            >
              ${
                this._compactLayout
                  ? this._renderCompactRows()
                  : repeat(
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
                                      ${this._renderSection(
                                        section,
                                        sectionNeedsMargin.has(idx)
                                      )}
                                    </hui-section-edit-mode>
                                  `
                                : this._renderSection(
                                    section,
                                    this._compactEligible
                                      ? section.config.background === undefined
                                      : sectionNeedsMargin.has(idx)
                                  )
                            }
                          </div>
                        `;
                      }
                    )
              }
              ${
                editMode
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
                  : nothing
              }
            </div>
          </ha-sortable>
          ${
            this._config?.sidebar
              ? html`
                  <hui-view-sidebar
                    class=${classMap({
                      hidden:
                        !hasSidebar ||
                        (useSidebarTabs && !this._sidebarTabActive),
                    })}
                    .hass=${this.hass}
                    .badges=${this.badges}
                    .lovelace=${this.lovelace}
                    .viewIndex=${this.index}
                    .config=${this._config.sidebar}
                    @sidebar-visibility-changed=${
                      this._handleSidebarVisibilityChanged
                    }
                  ></hui-view-sidebar>
                `
              : nothing
          }
        </div>
        <hui-view-footer
          .hass=${this.hass}
          .lovelace=${this.lovelace}
          .viewIndex=${this.index}
          .config=${this._config?.footer}
        ></hui-view-footer>
        <div class="imported-cards-section">
          ${
            editMode && this._config?.cards?.length
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
              : nothing
          }
        </div>
      </div>
    `;
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
      generateDefaultSection(this.hass.localize, cardConfig.type !== "heading") // If we move a heading card, we don't want to include a heading in the new section
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

  private _renderSection(section: HuiSection, alignBackground: boolean) {
    const hasBackground = section.config.background !== undefined;

    return html`
      <div
        class="section-container ${classMap({
          "has-background": hasBackground,
          "align-background": alignBackground,
        })}"
      >
        ${
          hasBackground
            ? html`<hui-section-background
                .hass=${this.hass}
                .background=${section.config.background}
                .theme=${section.config.theme}
              ></hui-section-background>`
            : nothing
        }
        ${section}
      </div>
    `;
  }

  private _createSection(): void {
    const newConfig = addSection(
      this.lovelace!.config,
      this.index!,
      generateDefaultSection(this.hass.localize, true)
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

    if (shouldShowSidebar !== this._sidebarTabActive) {
      this._toggleView();
    }
  }

  private _toggleView() {
    // Save current scroll position
    if (this._sidebarTabActive) {
      this._sidebarScrollTop = window.scrollY;
    } else {
      this._contentScrollTop = window.scrollY;
    }

    this._sidebarTabActive = !this._sidebarTabActive;

    // Add sidebar state to history
    updateHistoryState({ sidebar: this._sidebarTabActive });

    // Restore scroll position after view updates
    this.updateComplete.then(() => {
      const scrollY = this._sidebarTabActive
        ? this._sidebarScrollTop
        : this._contentScrollTop;
      window.scrollTo(0, scrollY);
    });
  }

  private _handleSidebarVisibilityChanged = (
    e: CustomEvent<{ visible: boolean }>
  ) => {
    this._sidebarVisible = e.detail.visible;
    // Reset sidebar tab when sidebar becomes hidden
    if (!e.detail.visible) {
      this._sidebarTabActive = false;
    }
  };

  static styles = css`
    :host {
      --row-height: var(--ha-view-sections-row-height, 56px);
      --row-gap: var(--ha-view-sections-row-gap, 24px);
      --column-gap: var(--ha-view-sections-column-gap, 32px);
      --column-max-width: var(--ha-view-sections-column-max-width, 500px);
      --column-min-width: var(--ha-view-sections-column-min-width, 320px);
      --narrow-column-gap: var(--ha-view-sections-narrow-column-gap, 8px);
      --top-margin: var(--ha-view-sections-extra-top-margin, 80px);
      display: block;
      flex: 1;
    }

    @media (max-width: 600px) {
      :host {
        --column-gap: var(--narrow-column-gap);
      }
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      padding: 0 var(--column-gap);
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
      border-radius: var(
        --ha-section-border-radius,
        var(--ha-border-radius-xl)
      );
      grid-column: span var(--column-span);
      grid-row: span var(--row-span);
    }

    .section:has(hui-section[hidden]) {
      display: none;
    }

    .section-container {
      position: relative;
    }

    .section-container.has-background {
      padding: var(--ha-space-2);
      border-radius: var(
        --ha-section-border-radius,
        var(--ha-border-radius-xl)
      );
    }

    .section-container.align-background {
      margin-top: var(--ha-space-2);
      margin-bottom: var(--ha-space-2);
    }

    .container {
      display: grid;
      grid-template-columns: [content-start] repeat(
          var(--content-column-count),
          1fr
        );
      gap: var(--row-gap) var(--column-gap);
      padding: var(--row-gap) 0;
      align-items: flex-start;
      flex: 1 0 auto;
    }

    .wrapper.has-sidebar .container {
      grid-template-columns:
        [content-start] repeat(var(--content-column-count), 1fr)
        [sidebar-start] 1fr;
    }

    /* With a single column, content and sidebar stack at full width */
    .wrapper.single-column.has-sidebar .container {
      grid-template-columns: 1fr;
    }

    hui-view-sidebar {
      grid-column: sidebar-start / -1;
    }

    .wrapper.single-column hui-view-sidebar {
      grid-column: 1 / -1;
    }

    .wrapper.has-sidebar-tabs hui-view-sidebar {
      padding-bottom: calc(
        var(--ha-space-14) + var(--ha-space-3) + var(--safe-area-inset-bottom)
      );
    }

    .hidden {
      display: none !important;
    }

    .sidebar-tabs {
      position: fixed;
      bottom: calc(var(--ha-space-3) + var(--safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%);
      padding: 0;
      z-index: 1;
    }

    .sidebar-tabs ha-control-select {
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

    .wrapper.single-column .content {
      grid-column: 1 / -1;
    }

    .wrapper.has-sidebar-tabs .content {
      padding-bottom: calc(
        var(--ha-space-14) + var(--ha-space-3) + var(--safe-area-inset-bottom)
      );
    }

    .content.compact {
      display: flex;
      flex-direction: column;
    }

    .compact-row {
      display: grid;
      grid-template-columns: repeat(var(--content-column-count), 1fr);
      column-gap: var(--column-gap);
      align-items: start;
      width: 100%;
    }

    .compact-lane {
      display: flex;
      flex-direction: column;
      gap: var(--row-gap);
      min-width: 0;
    }

    .compact-lane > .section {
      display: flow-root;
      flex: none;
    }

    .compact-lane > .section:has(hui-section[hidden]),
    .compact-row:not(:has(hui-section:not([hidden]))) {
      display: none;
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
      border-radius: var(
        --ha-section-border-radius,
        var(--ha-border-radius-xl)
      );
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
      border-radius: var(
        --ha-section-border-radius,
        var(--ha-border-radius-xl)
      );
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
      border-radius: var(
        --ha-section-border-radius,
        var(--ha-border-radius-xl)
      );
    }

    hui-view-header {
      display: block;
      padding-top: var(--row-gap);
    }

    hui-view-footer {
      display: block;
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
