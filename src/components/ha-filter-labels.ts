import { consume } from "@lit/context";
import type { SelectedDetail } from "@material/mwc-list";
import { mdiCog, mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { navigate } from "../common/navigate";
import { stringCompare } from "../common/string/compare";
import { labelsContext } from "../data/context";
import type { LabelRegistryEntry } from "../data/label/label_registry";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-check-list-item";
import "./ha-expansion-panel";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-label";
import "./ha-list";
import "./ha-list-item";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";

@customElement("ha-filter-labels")
export class HaFilterLabels extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @consume({ context: labelsContext, subscribe: true })
  @state()
  private _labels?: LabelRegistryEntry[];

  @state() private _shouldRender = false;

  @state() private _filter?: string;

  private _filteredLabels = memoizeOne(
    // `_value` used to recalculate the memoization when the selection changes
    (labels: LabelRegistryEntry[], filter: string | undefined, _value) =>
      labels
        .filter(
          (label) =>
            !filter ||
            label.name.toLowerCase().includes(filter) ||
            label.label_id.toLowerCase().includes(filter)
        )
        .sort((a, b) =>
          stringCompare(
            a.name || a.label_id,
            b.name || b.label_id,
            this.hass.locale.language
          )
        )
  );

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize("ui.panel.config.labels.caption")}
          ${this.value?.length
            ? html`<div class="badge">${this.value?.length}</div>
                <ha-icon-button
                  .path=${mdiFilterVariantRemove}
                  @click=${this._clearFilter}
                ></ha-icon-button>`
            : nothing}
        </div>
        ${this._shouldRender
          ? html`<ha-input-search
                appearance="outlined"
                .value=${this._filter}
                @input=${this._handleSearchChange}
              >
              </ha-input-search>
              <ha-list
                @selected=${this._labelSelected}
                class="ha-scrollbar"
                multi
              >
                ${repeat(
                  this._filteredLabels(
                    this._labels || [],
                    this._filter,
                    this.value
                  ),
                  (label) => label.label_id,
                  (label) =>
                    html`<ha-check-list-item
                      .value=${label.label_id}
                      .selected=${(this.value || []).includes(label.label_id)}
                      hasMeta
                    >
                      <ha-label
                        .color=${label.color}
                        .description=${label.description}
                      >
                        ${label.icon
                          ? html`<ha-icon
                              slot="icon"
                              .icon=${label.icon}
                            ></ha-icon>`
                          : nothing}
                        ${label.name}
                      </ha-label>
                    </ha-check-list-item>`
                )}
              </ha-list> `
          : nothing}
      </ha-expansion-panel>
      ${this.expanded
        ? html`<ha-list-item
            graphic="icon"
            @click=${this._manageLabels}
            class="add"
          >
            <ha-svg-icon slot="graphic" .path=${mdiCog}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.labels.manage_labels")}
          </ha-list-item>`
        : nothing}
    `;
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this.renderRoot.querySelector("ha-list")!.style.height =
          `${this.clientHeight - (49 + 48 + 32 + 4)}px`;
        // 49px - height of a header + 1px
        // 4px - padding-top of the search-input
        // 32px - height of the search input
        // 48px - height of ha-list-item
      }, 300);
    }
  }

  private _manageLabels() {
    navigate("/config/labels");
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleSearchChange(ev: InputEvent) {
    const value = (ev.target as HaInputSearch).value ?? "";
    this._filter = value.toLowerCase();
  }

  private async _labelSelected(ev: CustomEvent<SelectedDetail<Set<number>>>) {
    const filteredLabels = this._filteredLabels(
      this._labels || [],
      this._filter,
      this.value
    );

    const filteredLabelIds = new Set(filteredLabels.map((l) => l.label_id));

    // Keep previously selected labels that are not in the current filtered view
    const preservedLabels = (this.value || []).filter(
      (id) => !filteredLabelIds.has(id)
    );

    // Build the new selection from the filtered labels based on selected indices
    const newlySelectedLabels: string[] = [];
    for (const index of ev.detail.index) {
      const labelId = filteredLabels[index]?.label_id;
      if (labelId) {
        newlySelectedLabels.push(labelId);
      }
    }

    const value = [...preservedLabels, ...newlySelectedLabels];
    this.value = value.length ? value : [];

    fireEvent(this, "data-table-filter-changed", {
      value: value.length ? value : undefined,
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
      css`
        :host {
          position: relative;
          border-bottom: 1px solid var(--divider-color);
        }
        :host([expanded]) {
          flex: 1;
          height: 0;
        }
        ha-expansion-panel {
          --ha-card-border-radius: var(--ha-border-radius-square);
          --expansion-panel-content-padding: 0;
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
        .add {
          position: absolute;
          bottom: 0;
          right: 0;
          left: 0;
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
    "ha-filter-labels": HaFilterLabels;
  }
}
