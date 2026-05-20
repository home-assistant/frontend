import type { LitVirtualizer } from "@lit-labs/virtualizer";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { mdiMagnify, mdiMinusBoxOutline } from "@mdi/js";
import {
  css,
  html,
  LitElement,
  type CSSResultGroup,
  type TemplateResult,
} from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { tinykeys } from "tinykeys";
import {
  fireEvent,
  type HASSDomCurrentTargetEvent,
} from "../common/dom/fire_event";
import { loadVirtualizer } from "../resources/virtualizer";
import "./ha-combo-box-item";
import {
  DEFAULT_ROW_RENDERER_CONTENT,
  type PickerComboBoxItem,
} from "./ha-picker-combo-box";
import "./ha-svg-icon";

export interface PickerActionContext {
  host: HTMLElement;
  /** Imperatively close any picker surface hosting this list. */
  close: () => void;
}

/**
 * Item entry in `ha-picker-list`. When `onSelect` is set, the row behaves
 * as an action: clicking calls the callback instead of firing
 * `item-selected`.
 */
export interface PickerListItem extends PickerComboBoxItem {
  onSelect?: (ctx: PickerActionContext) => void | Promise<void>;
}

export type PickerListEntry = PickerListItem | string;

interface PickerListRowElement extends HTMLDivElement {
  index: number;
  value: string;
  disabled?: boolean;
  onSelect?: PickerListItem["onSelect"];
}

const DEFAULT_ROW: RenderItemFunction<PickerListItem> = (item) =>
  html`<ha-combo-box-item type="button" compact>
    ${DEFAULT_ROW_RENDERER_CONTENT(item)}
  </ha-combo-box-item>`;

/**
 * `ha-picker-list` — virtualized list for picker UIs.
 *
 * Headless: receives `items` already filtered and sorted. Renders rows
 * via `rowRenderer` (or a default Material row template). Supports:
 * - String entries as section/group titles.
 * - Items with `onSelect` as action rows (callback fires instead of
 *   `item-selected`).
 * - Keyboard navigation (ArrowUp/Down/Home/End/Enter).
 * - Highlighting + pinning the row matching `value`.
 *
 * Use inside `ha-picker-popover`, optionally paired with
 * `ha-picker-search` and `ha-picker-section-chips`.
 */
@customElement("ha-picker-list")
export class HaPickerList extends LitElement {
  @property({ attribute: false }) public items: PickerListEntry[] = [];

  @property() public value?: string;

  @property({ attribute: false })
  public rowRenderer?: RenderItemFunction<PickerListItem>;

  /** Reserved for future multi-select support. */
  @property({ attribute: "selection-mode" })
  public selectionMode: "single" | "multiple" = "single";

  /** Label shown when items is empty AND no search is active. */
  @property({ attribute: "empty-label" }) public emptyLabel?: string;

  /**
   * Label shown when items is empty and the current search yields no
   * match. May be a string, TemplateResult, or function of the search.
   */
  @property({ attribute: false })
  public notFoundLabel?:
    | string
    | TemplateResult
    | ((search: string) => string | TemplateResult);

  /**
   * Current search string. Used only to choose between empty/notFound
   * placeholders and the leading icon. Filtering is the consumer's job.
   */
  @property({ attribute: "current-search" }) public currentSearch = "";

  /** "popover" or "dialog" (affects bottom safe-area padding). */
  @property() public mode: "popover" | "dialog" = "popover";

  @state() private _highlightedIndex = -1;

  @state() private _valuePinned = true;

  @query("lit-virtualizer") public virtualizerElement?: LitVirtualizer;

  private _unsubscribeKeys?: () => void;

  protected firstUpdated() {
    loadVirtualizer();
    this._registerKeys();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeKeys?.();
  }

  public async focus() {
    await this.updateComplete;
    this.virtualizerElement?.focus();
  }

  public scrollToItem(index: number) {
    this.virtualizerElement
      ?.element(index)
      ?.scrollIntoView({ block: "nearest" });
  }

  // ──────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────

  protected render() {
    const items = this._displayItems();
    return html`
      <lit-virtualizer
        .keyFunction=${this._keyFunction}
        tabindex="0"
        scroller
        .items=${items}
        .renderItem=${this._renderEntry}
        .layout=${this.value && this._valuePinned
          ? {
              pin: {
                index: this._initialPinIndex(),
                block: "center",
              },
            }
          : undefined}
        @unpinned=${this._handleUnpinned}
        @focus=${this._focusList}
        @blur=${this._resetHighlight}
      ></lit-virtualizer>
    `;
  }

  private _displayItems(): PickerListEntry[] {
    if (this.items.length > 0) return this.items;
    // Single placeholder entry rendered as the "no items" row.
    return [{ id: "__empty__", primary: "" } as PickerListItem];
  }

  private _keyFunction = (item: PickerListEntry) =>
    typeof item === "string" ? item : item.id;

  private _renderEntry: RenderItemFunction<PickerListEntry> = (item, index) => {
    if (typeof item === "string") {
      return html`<div class="title">${item}</div>`;
    }
    if (item.id === "__empty__") {
      return this._renderEmptyRow();
    }
    const renderer = this.rowRenderer ?? DEFAULT_ROW;
    return html`<div
      id=${`list-item-${index}`}
      class="row ${this.value === item.id ? "current-value" : ""}"
      .value=${item.id}
      .index=${index}
      .disabled=${item.disabled}
      .onSelect=${item.onSelect}
      @click=${this._handleClick}
    >
      ${renderer(item as PickerListItem, index)}
    </div>`;
  };

  private _renderEmptyRow() {
    const search = this.currentSearch;
    const message = search
      ? typeof this.notFoundLabel === "function"
        ? this.notFoundLabel(search)
        : (this.notFoundLabel ?? "No matching items found")
      : (this.emptyLabel ?? "No items available");
    return html`
      <div class="row empty">
        <ha-combo-box-item type="text" compact>
          <ha-svg-icon
            slot="start"
            .path=${search ? mdiMagnify : mdiMinusBoxOutline}
          ></ha-svg-icon>
          <span slot="headline">${message}</span>
        </ha-combo-box-item>
      </div>
    `;
  }

  // ──────────────────────────────────────────────────────────
  // Selection
  // ──────────────────────────────────────────────────────────

  private _handleClick = (
    ev: MouseEvent & HASSDomCurrentTargetEvent<PickerListRowElement>
  ) => {
    ev.stopPropagation();
    const row = ev.currentTarget;
    if (row.disabled) return;
    const onSelect = row.onSelect;
    if (onSelect) {
      void onSelect({
        host: this,
        close: () => fireEvent(this, "picker-close-request"),
      });
      return;
    }
    fireEvent(this, "item-selected", {
      id: row.value,
      index: row.index,
      newTab: ev.ctrlKey || ev.metaKey,
    });
  };

  private _handleUnpinned = () => {
    this._valuePinned = false;
  };

  // ──────────────────────────────────────────────────────────
  // Keyboard navigation (ArrowUp/Down/Home/End/Enter)
  // ──────────────────────────────────────────────────────────

  private _registerKeys() {
    this._unsubscribeKeys = tinykeys(this, {
      ArrowDown: this._next,
      ArrowUp: this._prev,
      Home: this._first,
      End: this._last,
      Enter: this._commitHighlight,
      "$mod+Enter": this._commitHighlightNewTab,
    });
  }

  private _focusList = () => {
    if (this._highlightedIndex === -1) this._initializeHighlight();
  };

  private _resetHighlight = () => {
    this.virtualizerElement
      ?.querySelector(".selected")
      ?.classList.remove("selected");
    this._highlightedIndex = -1;
  };

  private _initializeHighlight() {
    if (!this.virtualizerElement) return;
    const items = this.virtualizerElement.items as PickerListEntry[];
    if (this.value) {
      const i = items.findIndex(
        (item) => typeof item !== "string" && item.id === this.value
      );
      if (i !== -1) {
        this._highlightedIndex = i;
        this._scrollToHighlight();
        return;
      }
    }
    this._first();
  }

  private _initialPinIndex(): number {
    if (!this.value) return 0;
    return this.items.findIndex(
      (item) => typeof item !== "string" && item.id === this.value
    );
  }

  private _isPickable(item: PickerListEntry | undefined): boolean {
    return !!item && typeof item !== "string" && item.id !== "__empty__";
  }

  private _step(direction: 1 | -1) {
    if (!this.virtualizerElement) return;
    const items = this.virtualizerElement.items as PickerListEntry[];
    if (!items.length) return;
    let i = this._highlightedIndex + direction;
    const guard = items.length;
    let n = 0;
    while (n++ < guard && i >= 0 && i < items.length) {
      if (this._isPickable(items[i])) {
        this._highlightedIndex = i;
        this._scrollToHighlight();
        return;
      }
      i += direction;
    }
  }

  private _next = (ev?: KeyboardEvent) => {
    ev?.preventDefault();
    if (this._highlightedIndex === -1) {
      this._initializeHighlight();
      return;
    }
    this._step(1);
  };

  private _prev = (ev?: KeyboardEvent) => {
    ev?.preventDefault();
    if (this._highlightedIndex === -1) {
      this._initializeHighlight();
      return;
    }
    this._step(-1);
  };

  private _first = (ev?: KeyboardEvent) => {
    ev?.preventDefault();
    if (!this.virtualizerElement) return;
    const items = this.virtualizerElement.items as PickerListEntry[];
    for (let i = 0; i < items.length; i++) {
      if (this._isPickable(items[i])) {
        this._highlightedIndex = i;
        this._scrollToHighlight();
        return;
      }
    }
  };

  private _last = (ev?: KeyboardEvent) => {
    ev?.preventDefault();
    if (!this.virtualizerElement) return;
    const items = this.virtualizerElement.items as PickerListEntry[];
    for (let i = items.length - 1; i >= 0; i--) {
      if (this._isPickable(items[i])) {
        this._highlightedIndex = i;
        this._scrollToHighlight();
        return;
      }
    }
  };

  private _commitHighlight = (ev: KeyboardEvent) => {
    this._commitAt(this._highlightedIndex, ev.ctrlKey || ev.metaKey);
  };

  private _commitHighlightNewTab = () => {
    this._commitAt(this._highlightedIndex, true);
  };

  private _commitAt(index: number, newTab: boolean) {
    if (index === -1 || !this.virtualizerElement) return;
    const item = this.virtualizerElement.items[index] as PickerListEntry;
    if (typeof item === "string") return;
    const row = this.virtualizerElement.element(
      index
    ) as PickerListRowElement | null;
    if (!row || row.disabled) return;
    if (item.onSelect) {
      void item.onSelect({
        host: this,
        close: () => fireEvent(this, "picker-close-request"),
      });
      return;
    }
    fireEvent(this, "item-selected", { id: item.id, index, newTab });
  }

  @eventOptions({ passive: true })
  private _scrollToHighlight() {
    this.virtualizerElement
      ?.querySelector(".selected")
      ?.classList.remove("selected");
    this.virtualizerElement
      ?.element(this._highlightedIndex)
      ?.scrollIntoView({ block: "nearest" });
    requestAnimationFrame(() => {
      this.virtualizerElement
        ?.querySelector(`#list-item-${this._highlightedIndex}`)
        ?.classList.add("selected");
    });
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      min-height: 0;
      flex: 1;
    }
    lit-virtualizer {
      height: 100%;
      outline: none;
      contain: strict;
    }
    .row {
      cursor: pointer;
    }
    .row.empty {
      cursor: default;
    }
    .row.current-value::part(base),
    .row.current-value ha-combo-box-item::part(base) {
      background-color: var(--ha-color-fill-neutral-quiet-resting);
    }
    .row.selected::part(base),
    .row.selected ha-combo-box-item::part(base) {
      background-color: var(--ha-color-fill-neutral-quiet-resting);
    }
    .title {
      padding: var(--ha-space-2) var(--ha-space-4);
      font-weight: var(--ha-font-weight-medium);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picker-list": HaPickerList;
  }
  interface HASSDomEvents {
    "item-selected": { id: string; index: number; newTab?: boolean };
    "picker-close-request": undefined;
  }
}
