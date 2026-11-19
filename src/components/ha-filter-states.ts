import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { createRef, ref } from "lit/directives/ref";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { arrayWith, arrayWithout } from "../common/array/array-with";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";
import type { ListFilterValue } from "../data/data_table_filters";
import {
  listFilterEventValue,
  listFilterValue,
} from "../data/data_table_filters";
import "./ha-expansion-panel";
import {
  filterBadgeStyles,
  NO_VALUE_ID,
  renderFilterBadge,
} from "./ha-filter-mode";
import "./ha-icon";
import "./ha-icon-button";
import "./item/ha-list-item-option";
import type { HaListItemOption } from "./item/ha-list-item-option";
import "./list/ha-list-selectable";
import type { HaListSelectable } from "./list/ha-list-selectable";

@customElement("ha-filter-states")
export class HaFilterStates extends LitElement {
  @state()
  @consumeLocalize()
  protected _localize!: LocalizeFunc;

  @property() public label?: string;

  /** Show the mode toggle, so the filter can show the items that don't match */
  @property({ type: Boolean }) public excludable = false;

  /** Adds an option for the items without any value, labelled with this */
  @property({ attribute: "none-label" }) public noneLabel?: string;

  // A plain list of ids is still accepted
  @property({ attribute: false }) public value?: string[] | ListFilterValue;

  @property({ attribute: false }) public states?: {
    value: any;
    label?: string;
    icon?: string;
  }[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  protected render() {
    if (!this.states) {
      return nothing;
    }
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.label}
          ${
            this._count
              ? html`${renderFilterBadge(
                    this._localize,
                    this._count,
                    this._listValue?.exclude
                  )}
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
          ? html`
              <div class="content" ${ref(this._content)}>
                ${
                  this.excludable
                    ? html`<ha-filter-mode
                        .exclude=${this._listValue?.exclude ?? false}
                        @filter-mode-changed=${this._modeChanged}
                      ></ha-filter-mode>`
                    : nothing
                }
                <ha-list-selectable
                  multi
                  aria-label=${ifDefined(this.label)}
                  @ha-list-item-selected=${this._handleItemToggled}
                  @ha-list-item-deselected=${this._handleItemToggled}
                >
                  ${this.states.map(
                    (item) =>
                      html`<ha-list-item-option
                        appearance="checkbox"
                        selection-position="end"
                        .value=${item.value}
                        .selected=${this._listValue?.ids?.includes(item.value) ?? false}
                      >
                        ${
                          item.icon
                            ? html`<ha-icon
                                slot="start"
                                .icon=${item.icon}
                              ></ha-icon>`
                            : nothing
                        }
                        <span slot="headline">${item.label}</span>
                      </ha-list-item-option>`
                  )}
                  ${
                    this.noneLabel
                      ? html`<ha-list-item-option
                          appearance="checkbox"
                          selection-position="end"
                          .value=${NO_VALUE_ID}
                          .selected=${this._listValue?.none ?? false}
                        >
                          <span slot="headline" class="no-value"
                            >${this.noneLabel}</span
                          >
                        </ha-list-item-option>`
                      : nothing
                  }
                </ha-list-selectable>
              </div>
            `
          : nothing
      }
    `;
  }

  private get _listValue(): ListFilterValue | undefined {
    return listFilterValue(this.value);
  }

  private get _count(): number {
    const value = this._listValue;
    return (value?.ids?.length || 0) + (value?.none ? 1 : 0);
  }

  private _setValue(value: ListFilterValue) {
    this.value = value;
    fireEvent(this, "data-table-filter-changed", {
      value: listFilterEventValue(value),
      items: undefined,
    });
  }

  private _modeChanged(ev: CustomEvent<{ exclude: boolean }>) {
    this._setValue({ ...this._listValue, exclude: ev.detail.exclude });
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleItemToggled(
    ev: HASSDomEvent<number> & HASSDomCurrentTargetEvent<HaListSelectable>
  ) {
    const option = (
      ev.currentTarget.items[ev.detail] as HaListItemOption | undefined
    )?.value;
    if (!option) {
      return;
    }

    if (option === NO_VALUE_ID) {
      this._setValue({
        ...this._listValue,
        none: ev.type === "ha-list-item-selected",
      });
      return;
    }

    const value = this._listValue ?? {};
    this._setValue({
      ...value,
      ids:
        ev.type === "ha-list-item-selected"
          ? arrayWith(value.ids, option)
          : arrayWithout(value.ids, option),
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-states": HaFilterStates;
  }
}
