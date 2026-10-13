import type { SelectedDetail } from "@material/mwc-list";
import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { fireEvent } from "../common/dom/fire_event";
import { haStyleScrollbar } from "../resources/styles";
import "./ha-check-list-item";
import "./ha-expansion-panel";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-list";

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
    const hasIcon = this.states.find((item) => item.icon);
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
                <ha-list
                  @selected=${this._statesSelected}
                  multi
                  class="ha-scrollbar"
                >
                  ${this.states.map(
                    (item) =>
                      html`<ha-check-list-item
                        .value=${item.value}
                        .selected=${this.value?.includes(item.value) ?? false}
                        .graphic=${hasIcon ? "icon" : null}
                      >
                        ${
                          item.icon
                            ? html`<ha-icon
                                slot="graphic"
                                .icon=${item.icon}
                              ></ha-icon>`
                            : nothing
                        }
                        ${item.label}
                      </ha-check-list-item>`
                  )}
                </ha-list>
              </div>
            `
          : nothing
      }
    `;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private async _statesSelected(ev: CustomEvent<SelectedDetail<Set<number>>>) {
    if (!ev.detail.index.size) {
      fireEvent(this, "data-table-filter-changed", {
        value: [],
        items: undefined,
      });
      this.value = [];
      return;
    }

    const value: string[] = [];

    for (const index of ev.detail.index) {
      const val = this.states![index].value;
      value.push(val);
    }
    this.value = value;

    fireEvent(this, "data-table-filter-changed", {
      value,
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
