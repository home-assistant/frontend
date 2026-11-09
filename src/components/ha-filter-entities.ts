import type { ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { arrayWith, arrayWithout } from "../common/array/array-with";
import { fireEvent } from "../common/dom/fire_event";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { stringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { deepEqual } from "../common/util/deep-equal";
import {
  apiContext,
  formattersContext,
  internationalizationContext,
  statesContext,
} from "../data/context";
import type { RelatedResult } from "../data/search";
import { findRelated } from "../data/search";
import "./ha-expansion-panel";
import "./ha-state-icon";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";
import "./item/ha-list-item-option";
import "./list/ha-list-selectable-virtualized";
import type { HaListSelectableVirtualized } from "./list/ha-list-selectable-virtualized";
import type { HaListVirtualizedItem } from "./list/ha-list-virtualized";

interface EntityItem extends HaListVirtualizedItem {
  stateObj: HassEntity;
  name: string;
}

@customElement("ha-filter-entities")
export class HaFilterEntities extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: statesContext, subscribe: true })
  @state()
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: formattersContext, subscribe: true })
  @state()
  private _formatters!: ContextType<typeof formattersContext>;

  @consume({ context: internationalizationContext, subscribe: true })
  @state()
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @property({ attribute: false }) public value?: string[];

  @property() public type?: keyof RelatedResult;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _filter?: string;

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  @query("ha-list-selectable-virtualized")
  private _list?: HaListSelectableVirtualized;

  private _relatedRequestId = 0;

  public willUpdate(properties: PropertyValues<this>) {
    super.willUpdate(properties);

    if (
      properties.has("value") &&
      !deepEqual(this.value, properties.get("value"))
    ) {
      this._findRelated();
    }
  }

  protected updated(properties: PropertyValues<this>) {
    super.updated(properties);

    // The rows don't change with the value, so render the selection again
    if (properties.has("value")) {
      this._list?.requestRowsUpdate();
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
          ${this._localize("ui.panel.config.entities.caption")}
          ${
            this.value?.length
              ? html`<div class="badge">${this.value?.length}</div>
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
                  .value=${this._filter}
                  @input=${this._handleSearchChange}
                >
                </ha-input-search>
                <ha-list-selectable-virtualized
                  multi
                  aria-label=${this._localize("ui.panel.config.entities.caption")}
                  .rows=${this._currentEntities()}
                  .rowRenderer=${this._renderItem}
                  @ha-list-item-selected=${this._handleItemToggled}
                  @ha-list-item-deselected=${this._handleItemToggled}
                ></ha-list-selectable-virtualized>
              </div>
            `
          : nothing
      }
    `;
  }

  private _renderItem = (item?: EntityItem) =>
    !item
      ? nothing
      : html`<ha-list-item-option
          style="width: 100%;"
          appearance="checkbox"
          selection-position="end"
          .value=${item.id}
          .selected=${this.value?.includes(item.id) ?? false}
        >
          <ha-state-icon
            slot="start"
            .stateObj=${item.stateObj}
          ></ha-state-icon>
          <span slot="headline">${item.name}</span>
        </ha-list-item-option>`;

  private _handleItemToggled(ev: CustomEvent<number>) {
    const entityId = this._currentEntities()[ev.detail]?.id;
    if (!entityId) {
      return;
    }

    this.value =
      ev.type === "ha-list-item-selected"
        ? arrayWith(this.value, entityId)
        : arrayWithout(this.value, entityId);
  }

  private _currentEntities() {
    return this._entities(
      this._states,
      this._formatters,
      this.type,
      this._filter || "",
      this._i18n.locale.language
    );
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleSearchChange(ev: InputEvent) {
    const target = ev.target as HaInputSearch;
    this._filter = (target.value ?? "").toLowerCase();
  }

  private _entities = memoizeOne(
    (
      states: ContextType<typeof statesContext>,
      formatters: ContextType<typeof formattersContext>,
      type: this["type"],
      filter: string,
      language: string | undefined
    ): EntityItem[] =>
      Object.values(states)
        .filter((stateObj) => !type || computeStateDomain(stateObj) !== type)
        .map((stateObj) => ({
          id: stateObj.entity_id,
          interactive: true,
          stateObj,
          name: formatters.formatEntityName(stateObj),
        }))
        .filter(
          (item) =>
            !filter ||
            item.stateObj.entity_id.toLowerCase().includes(filter) ||
            item.name.toLowerCase().includes(filter)
        )
        .sort((a, b) => stringCompare(a.name, b.name, language))
  );

  private async _findRelated() {
    const requestId = ++this._relatedRequestId;
    const relatedPromises: Promise<RelatedResult>[] = [];

    if (!this.value?.length) {
      this.value = [];
      fireEvent(this, "data-table-filter-changed", {
        value: [],
        items: undefined,
      });
      return;
    }

    for (const entityId of this.value) {
      if (this.type) {
        relatedPromises.push(findRelated(this._api, "entity", entityId));
      }
    }

    const results = await Promise.all(relatedPromises);

    // The value changed while this lookup ran
    if (requestId !== this._relatedRequestId) {
      return;
    }

    const items = new Set<string>();
    for (const result of results) {
      if (result[this.type!]) {
        result[this.type!]!.forEach((item) => items.add(item));
      }
    }

    fireEvent(this, "data-table-filter-changed", {
      value: this.value,
      items: this.type ? items : undefined,
    });
  }

  private _clearFilter(ev) {
    ev.preventDefault();
    this.value = undefined;
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      filterPanelStyles,
      css`
        ha-list-selectable-virtualized {
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
          margin-left: 8px;
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
    "ha-filter-entities": HaFilterEntities;
  }
}
