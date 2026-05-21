import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import Fuse from "fuse.js";
import {
  css,
  html,
  LitElement,
  type CSSResultGroup,
  type TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../common/dom/fire_event";
import {
  multiTermSortedSearch,
  type FuseWeightedKey,
} from "../resources/fuseMultiTerm";
import { DEFAULT_SEARCH_KEYS } from "./ha-picker-combo-box";
import type { PickerListItem } from "./ha-picker-list";
import "./ha-picker-list";
import "./ha-picker-search";
import type { HaPickerSearch } from "./ha-picker-search";

export type PickerSearchFn<T extends PickerListItem = PickerListItem> = (
  search: string,
  filtered: T[],
  all: T[]
) => T[];

/**
 * Search input + virtualized list with built-in Fuse.js filtering.
 * For custom filtering pipelines, compose `ha-picker-search` and
 * `ha-picker-list` directly instead.
 */
@customElement("ha-picker-search-list")
export class HaPickerSearchList<
  T extends PickerListItem = PickerListItem,
> extends LitElement {
  @property({ attribute: false }) public items: T[] = [];

  @property() public value?: string;

  @property({ attribute: false }) public searchKeys?: FuseWeightedKey[];

  @property({ attribute: false }) public searchFn?: PickerSearchFn<T>;

  @property({ attribute: false })
  public rowRenderer?: RenderItemFunction<T>;

  @property({ attribute: false }) public actions?: PickerListItem[];

  @property({ attribute: "search-placeholder" })
  public searchPlaceholder?: string;

  @property({ attribute: "empty-label" }) public emptyLabel?: string;

  @property({ attribute: false })
  public notFoundLabel?:
    | string
    | TemplateResult
    | ((search: string) => string | TemplateResult);

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @state() private _search = "";

  @query("ha-picker-search") private _searchEl?: HaPickerSearch;

  public async focus() {
    await this.updateComplete;
    this._searchEl?.focus();
  }

  public refreshItems() {
    this.requestUpdate();
  }

  protected render() {
    const displayItems = this._computeDisplayItems(
      this.items,
      this._search,
      this.searchKeys,
      this.searchFn,
      this.actions
    );
    return html`
      <ha-picker-search
        ?autofocus=${this.autofocus}
        .value=${this._search}
        .placeholder=${this.searchPlaceholder ?? ""}
        @search-changed=${this._handleSearchChanged}
      ></ha-picker-search>
      <ha-picker-list
        .items=${displayItems}
        .value=${this.value}
        .rowRenderer=${this.rowRenderer as RenderItemFunction<PickerListItem>}
        .currentSearch=${this._search}
        .notFoundLabel=${this.notFoundLabel}
        .emptyLabel=${this.emptyLabel}
      ></ha-picker-list>
    `;
  }

  private _fuseIndex = memoizeOne(
    (items: T[], searchKeys?: FuseWeightedKey[]) =>
      Fuse.createIndex(searchKeys ?? DEFAULT_SEARCH_KEYS, items)
  );

  private _computeDisplayItems = memoizeOne(
    (
      items: T[],
      search: string,
      searchKeys: FuseWeightedKey[] | undefined,
      searchFn: PickerSearchFn<T> | undefined,
      actions: PickerListItem[] | undefined
    ): PickerListItem[] => {
      let filtered = items;
      if (search) {
        const keys = searchKeys ?? DEFAULT_SEARCH_KEYS;
        const index = this._fuseIndex(items, keys);
        filtered = multiTermSortedSearch<T>(
          items,
          search,
          keys,
          (item) => item.id,
          index
        );
        if (searchFn) {
          filtered = searchFn(search, filtered, items);
        }
      }
      if (actions?.length) {
        return [...filtered, ...actions];
      }
      return filtered;
    }
  );

  private _handleSearchChanged = (ev: HASSDomEvent<{ value: string }>) => {
    this._search = ev.detail.value;
  };

  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picker-search-list": HaPickerSearchList;
  }
}
