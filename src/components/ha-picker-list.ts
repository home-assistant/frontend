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
import { customElement, property, query, state } from "lit/decorators";
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

const EMPTY_ROW_ID = "___empty___";

export interface PickerActionContext {
  host: HTMLElement;
  close: () => void;
}

/** Items with `onSelect` are action rows: the callback fires instead of `item-selected`. */
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
 * Headless virtualized list for picker UIs. Receives pre-filtered `items`,
 * renders rows via `rowRenderer`. String entries are section titles.
 */
@customElement("ha-picker-list")
export class HaPickerList extends LitElement {
  @property({ attribute: false }) public items: PickerListEntry[] = [];

  @property() public value?: string;

  @property({ attribute: false })
  public rowRenderer?: RenderItemFunction<PickerListItem>;

  @property({ attribute: "empty-label" }) public emptyLabel?: string;

  @property({ attribute: false })
  public notFoundLabel?:
    | string
    | TemplateResult
    | ((search: string) => string | TemplateResult);

  /** Current search string. Picks between empty/notFound placeholders; filtering is the consumer's job. */
  @property({ attribute: "current-search" }) public currentSearch = "";

  @state() private _highlightedIndex = -1;

  @state() private _valuePinned = true;

  @query("lit-virtualizer") public virtualizerElement?: LitVirtualizer;

  private _unsubscribeKeys?: () => void;

  public willUpdate() {
    if (!this.hasUpdated) {
      loadVirtualizer();
    }
  }

  protected firstUpdated() {
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

  protected render() {
    const items = this.items.length
      ? this.items
      : [{ id: EMPTY_ROW_ID, primary: "" } as PickerListItem];
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

  private _keyFunction = (item: PickerListEntry) =>
    typeof item === "string" ? item : item.id;

  private _renderEntry: RenderItemFunction<PickerListEntry> = (item, index) => {
    if (typeof item === "string") {
      return html`<div class="title">${item}</div>`;
    }
    if (item.id === EMPTY_ROW_ID) {
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

  private _handleClick = (
    ev: MouseEvent & HASSDomCurrentTargetEvent<PickerListRowElement>
  ) => {
    ev.stopPropagation();
    const row = ev.currentTarget;
    if (row.disabled) return;
    this._dispatchSelection(
      { id: row.value, onSelect: row.onSelect } as PickerListItem,
      row.index,
      ev.ctrlKey || ev.metaKey
    );
  };

  private _dispatchSelection(
    item: PickerListItem,
    index: number,
    newTab: boolean
  ) {
    if (item.onSelect) {
      void item.onSelect({
        host: this,
        close: () => fireEvent(this, "picker-close-request"),
      });
      return;
    }
    fireEvent(this, "item-selected", { id: item.id, index, newTab });
  }

  private _handleUnpinned = () => {
    this._valuePinned = false;
  };

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
    return !!item && typeof item !== "string" && item.id !== EMPTY_ROW_ID;
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
    this._dispatchSelection(item, index, newTab);
  }

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
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    lit-virtualizer {
      flex: 1;
      outline: none;
    }
    .row {
      display: flex;
      width: 100%;
      align-items: center;
      box-sizing: border-box;
      min-height: 36px;
      cursor: pointer;
    }
    .row.empty {
      cursor: default;
    }
    .row ha-combo-box-item {
      width: 100%;
    }
    .row.current-value {
      background-color: var(--ha-color-fill-primary-quiet-resting);
    }
    .row.selected {
      background-color: var(--ha-color-fill-neutral-quiet-hover);
    }
    @media (prefers-color-scheme: dark) {
      .row.selected {
        background-color: var(--ha-color-fill-neutral-normal-hover);
      }
    }
    .title {
      box-sizing: border-box;
      width: 100%;
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      padding: var(--ha-space-1) var(--ha-space-4);
      font-weight: var(--ha-font-weight-bold);
      color: var(--secondary-text-color);
      min-height: var(--ha-space-6);
      display: flex;
      align-items: center;
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
