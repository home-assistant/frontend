import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import memoizeOne from "memoize-one";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../../../common/controllers/filter-panel-controller";
import {
  fireEvent,
  type HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import "../../../components/ha-check-list-item";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon-button";
import "../../../components/ha-list";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
import { haStyleScrollbar } from "../../../resources/styles";
import { loadVirtualizer } from "../../../resources/virtualizer";
import type { AuthorOption } from "../dashboards/dashboard-repositories";

// There can be thousands of authors, only the ones in view are rendered
@customElement("ha-marketplace-filter-authors")
export class HaMarketplaceFilterAuthors extends LitElement {
  @property() public label?: string;

  @property({ attribute: false }) public value?: string[];

  @property({ attribute: false }) public authors: AuthorOption[] = [];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _search = "";

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  public willUpdate(properties: PropertyValues<this>) {
    super.willUpdate(properties);

    if (!this.hasUpdated) {
      loadVirtualizer();
    }
  }

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.label}
          ${
            this.value?.length
              ? html`<div class="badge">${this.value.length}</div>
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    @click=${this._clearFilter}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${
        this._panel.showContent
          ? html`
              <div class="content" ${ref(this._content)}>
                <ha-input-search
                  appearance="outlined"
                  .value=${this._search}
                  @input=${this._handleSearchChange}
                >
                </ha-input-search>
                <ha-list class="ha-scrollbar" multi>
                  <lit-virtualizer
                    .items=${this._filteredAuthors(this.authors, this._search)}
                    .keyFunction=${this._keyFunction}
                    .renderItem=${this._renderItem}
                    @click=${this._handleItemClick}
                    @keydown=${this._handleItemKeydown}
                  >
                  </lit-virtualizer>
                </ha-list>
              </div>
            `
          : nothing
      }
    `;
  }

  private _filteredAuthors = memoizeOne(
    (authors: AuthorOption[], search: string): AuthorOption[] => {
      const query = search.trim().toLowerCase();

      return query
        ? authors.filter((author) => author.value.includes(query))
        : authors;
    }
  );

  private _keyFunction = (author?: AuthorOption) => author?.value;

  private _renderItem = (author?: AuthorOption) =>
    author
      ? html`<ha-check-list-item
          tabindex="0"
          .value=${author.value}
          .selected=${this.value?.includes(author.value) ?? false}
        >
          ${author.label}
        </ha-check-list-item>`
      : nothing;

  private _handleItemKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._handleItemClick(ev);
    }
  }

  private _handleItemClick(ev: Event) {
    if (!(ev.target instanceof Element)) {
      return;
    }

    const listItem = ev.target.closest("ha-check-list-item");

    const author = listItem?.value;

    if (!listItem || !author) {
      return;
    }

    const value = this.value?.includes(author)
      ? this.value.filter((picked) => picked !== author)
      : [...(this.value ?? []), author];

    this.value = value;
    listItem.selected = value.includes(author);
    fireEvent(this, "data-table-filter-changed", {
      value,
      items: undefined,
    });
  }

  private _expandedChanged(ev: CustomEvent<{ expanded: boolean }>) {
    this.expanded = ev.detail.expanded;
  }

  private _handleSearchChange(ev: HASSDomTargetEvent<HaInputSearch>) {
    this._search = ev.target.value ?? "";
  }

  private _clearFilter(ev: Event) {
    ev.preventDefault();
    this.value = undefined;
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      filterPanelStyles,
      css`
        ha-list {
          flex: 1;
          min-height: 0;
        }
        .header {
          display: flex;
          align-items: center;
        }
        .header ha-icon-button {
          margin-inline-start: auto;
          margin-inline-end: 8px;
        }
        .badge {
          display: inline-block;
          margin-inline-start: 8px;
          margin-inline-end: 0;
          min-width: 16px;
          box-sizing: border-box;
          border-radius: var(--ha-border-radius-circle);
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-normal);
          background-color: var(--primary-color);
          line-height: var(--ha-line-height-normal);
          text-align: center;
          padding: 0px 2px;
          color: var(--text-primary-color);
        }
        ha-check-list-item {
          width: 100%;
        }
        ha-input-search {
          display: block;
          padding: var(--ha-space-1) var(--ha-space-2) 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marketplace-filter-authors": HaMarketplaceFilterAuthors;
  }
}
