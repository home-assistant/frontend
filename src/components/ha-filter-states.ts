import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { createRef, ref } from "lit/directives/ref";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { toggleValue } from "../common/array/toggle-value";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-expansion-panel";
import "./ha-icon";
import "./ha-icon-button";
import "./item/ha-list-item-option";
import type { HaListItemOption } from "./item/ha-list-item-option";
import "./list/ha-list-selectable";
import type { HaListSelectable } from "./list/ha-list-selectable";

@customElement("ha-filter-states")
export class HaFilterStates extends LitElement {
  @property() public label?: string;

  @property({ attribute: false }) public value?: string[];

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
                        .selected=${this.value?.includes(item.value) ?? false}
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
                </ha-list-selectable>
              </div>
            `
          : nothing
      }
    `;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleItemToggled(
    ev: HASSDomEvent<number> & HASSDomCurrentTargetEvent<HaListSelectable>
  ) {
    const state = (
      ev.currentTarget.items[ev.detail] as HaListItemOption | undefined
    )?.value;
    if (!state) {
      return;
    }

    this.value = toggleValue(
      this.value,
      state,
      ev.type === "ha-list-item-selected"
    );

    fireEvent(this, "data-table-filter-changed", {
      value: this.value,
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
