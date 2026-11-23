import type { ContextType } from "@lit/context";
import { mdiCog, mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { arrayWith, arrayWithout } from "../common/array/array-with";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";
import { navigate } from "../common/navigate";
import { stringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { internationalizationContext, labelsContext } from "../data/context";
import type { ListFilterValue } from "../data/data_table_filters";
import {
  listFilterEventValue,
  listFilterValue,
} from "../data/data_table_filters";
import type { LabelRegistryEntry } from "../data/label/label_registry";
import "./ha-expansion-panel";
import { filterBadgeStyles, renderFilterBadge } from "./ha-filter-mode";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-label";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";
import "./item/ha-list-item-button";
import "./item/ha-list-item-option";
import type { HaListItemOption } from "./item/ha-list-item-option";
import "./list/ha-list-base";
import "./list/ha-list-selectable";
import type { HaListSelectable } from "./list/ha-list-selectable";

@customElement("ha-filter-labels")
export class HaFilterLabels extends LitElement {
  // A plain list of label ids is still accepted from stored filters
  @property({ attribute: false }) public value?: ListFilterValue | string[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: internationalizationContext, subscribe: true })
  @state()
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: labelsContext, subscribe: true })
  @state()
  private _labels?: LabelRegistryEntry[];

  @state() private _filter?: string;

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  private _filteredLabels = memoizeOne(
    (
      labels: LabelRegistryEntry[],
      filter: string | undefined,
      language: string | undefined
    ) =>
      labels
        .filter(
          (label) =>
            !filter ||
            label.name.toLowerCase().includes(filter) ||
            label.label_id.toLowerCase().includes(filter)
        )
        .sort((a, b) =>
          stringCompare(a.name || a.label_id, b.name || b.label_id, language)
        )
  );

  // The id of the No label option, which can't be a label id
  private static readonly _noneId = "__none__";

  protected render() {
    const value = listFilterValue(this.value);
    const count = (value?.ids?.length || 0) + (value?.none ? 1 : 0);
    const noLabel = this._localize("ui.components.subpage-data-table.no_label");
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._localize("ui.panel.config.labels.caption")}
          ${
            count
              ? html`${renderFilterBadge(this._localize, count, value?.exclude)}
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    .label=${this._localize(
                      "ui.components.subpage-data-table.clear_filter"
                    )}
                    @click=${this._clearFilter}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${
        this._panel.showContent
          ? html`<div class="content" ${ref(this._content)}>
              <ha-filter-mode
                .exclude=${value?.exclude ?? false}
                @filter-mode-changed=${this._modeChanged}
              ></ha-filter-mode>
              <ha-input-search
                appearance="outlined"
                .value=${this._filter}
                @input=${this._handleSearchChange}
              >
              </ha-input-search>
              <ha-list-selectable
                multi
                aria-label=${this._localize("ui.panel.config.labels.caption")}
                @ha-list-item-selected=${this._handleItemToggled}
                @ha-list-item-deselected=${this._handleItemToggled}
              >
                ${
                  !this._filter || noLabel.toLowerCase().includes(this._filter)
                    ? html`<ha-list-item-option
                        appearance="checkbox"
                        selection-position="end"
                        .value=${HaFilterLabels._noneId}
                        .selected=${value?.none ?? false}
                      >
                        <span slot="headline">${noLabel}</span>
                      </ha-list-item-option>`
                    : nothing
                }
                ${repeat(
                  this._filteredLabels(
                    this._labels || [],
                    this._filter,
                    this._i18n.locale.language
                  ),
                  (label) => label.label_id,
                  (label) =>
                    html`<ha-list-item-option
                      appearance="checkbox"
                      selection-position="end"
                      .value=${label.label_id}
                      .selected=${value?.ids?.includes(label.label_id) ?? false}
                    >
                      <ha-label
                        slot="headline"
                        .color=${label.color}
                        .description=${label.description}
                      >
                        ${
                          label.icon
                            ? html`<ha-icon
                                slot="icon"
                                .icon=${label.icon}
                              ></ha-icon>`
                            : nothing
                        }
                        ${label.name}
                      </ha-label>
                    </ha-list-item-option>`
                )}
              </ha-list-selectable>
              <ha-list-base>
                <ha-list-item-button @click=${this._manageLabels}>
                  <ha-svg-icon slot="start" .path=${mdiCog}></ha-svg-icon>
                  <span slot="headline"
                    >${this._localize("ui.panel.config.labels.manage_labels")}</span
                  >
                </ha-list-item-button>
              </ha-list-base>
            </div>`
          : nothing
      }
    `;
  }

  private _manageLabels() {
    navigate("/config/labels");
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleSearchChange(ev: InputEvent) {
    const value = (ev.target as HaInputSearch).value ?? "";
    this._filter = value.toLowerCase();
  }

  private _handleItemToggled(
    ev: HASSDomEvent<number> & HASSDomCurrentTargetEvent<HaListSelectable>
  ) {
    const labelId = (
      ev.currentTarget.items[ev.detail] as HaListItemOption | undefined
    )?.value;
    if (!labelId) {
      return;
    }

    const selected = ev.type === "ha-list-item-selected";
    const value = listFilterValue(this.value) ?? {};

    this._setValue(
      labelId === HaFilterLabels._noneId
        ? { ...value, none: selected }
        : {
            ...value,
            ids: selected
              ? arrayWith(value.ids, labelId)
              : arrayWithout(value.ids, labelId),
          }
    );
  }

  private _modeChanged(ev: CustomEvent<{ exclude: boolean }>) {
    this._setValue({
      ...listFilterValue(this.value),
      exclude: ev.detail.exclude,
    });
  }

  private _setValue(value: ListFilterValue) {
    this.value = value;
    fireEvent(this, "data-table-filter-changed", {
      value: listFilterEventValue(value),
      items: undefined,
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
      filterBadgeStyles,
      css`
        ha-list-selectable {
          display: flex;
          flex: 1;
          min-height: 0;
        }
        ha-list-selectable::part(base) {
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
        .warning {
          color: var(--error-color);
        }
        ha-input-search {
          display: block;
          padding: var(--ha-space-1) var(--ha-space-2) var(--ha-space-2);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-labels": HaFilterLabels;
  }
}
