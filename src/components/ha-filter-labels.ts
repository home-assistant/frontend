import "@material/mwc-list/mwc-list";
import type { SelectedDetail } from "@material/mwc-list";
import "@material/mwc-menu/mwc-menu-surface";
import memoizeOne from "memoize-one";
import { mdiCog, mdiFilterVariantRemove } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { computeCssColor } from "../common/color/compute-color";
import { fireEvent } from "../common/dom/fire_event";
import { navigate } from "../common/navigate";
import type { LabelRegistryEntry } from "../data/label_registry";
import { subscribeLabelRegistry } from "../data/label_registry";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-check-list-item";
import "./ha-expansion-panel";
import "./ha-icon";
import "./ha-label";
import "./ha-icon-button";
import "./ha-list-item";
import "./search-input-outlined";
import { stringCompare } from "../common/string/compare";

@customElement("ha-filter-labels")
export class HaFilterLabels extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _labels: LabelRegistryEntry[] = [];

  @state() private _shouldRender = false;

  @state() private _filter?: string;

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeLabelRegistry(this.hass.connection, (labels) => {
        this._labels = labels;
      }),
    ];
  }

  private _filteredLabels = memoizeOne(
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
        leftChevron
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
          ? html`<search-input-outlined
                .hass=${this.hass}
                .filter=${this._filter}
                @value-changed=${this._handleSearchChange}
              >
              </search-input-outlined>
              <mwc-list
                @selected=${this._labelSelected}
                class="ha-scrollbar"
                multi
              >
                ${repeat(
                  this._filteredLabels(this._labels, this._filter, this.value),
                  (label) => label.label_id,
                  (label) => {
                    const color = label.color
                      ? computeCssColor(label.color)
                      : undefined;
                    return html`<ha-check-list-item
                      .value=${label.label_id}
                      .selected=${(this.value || []).includes(label.label_id)}
                      hasMeta
                    >
                      <ha-label style=${color ? `--color: ${color}` : ""}>
                        ${label.icon
                          ? html`<ha-icon
                              slot="icon"
                              .icon=${label.icon}
                            ></ha-icon>`
                          : nothing}
                        ${label.name}
                      </ha-label>
                    </ha-check-list-item>`;
                  }
                )}
              </mwc-list> `
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

  protected updated(changed) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this.renderRoot.querySelector("mwc-list")!.style.height =
          `${this.clientHeight - (49 + 48 + 32)}px`;
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

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value.toLowerCase();
  }

  private async _labelSelected(ev: CustomEvent<SelectedDetail<Set<number>>>) {
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
      const labelId = this._labels[index].label_id;
      value.push(labelId);
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
          --ha-card-border-radius: 0;
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
          border-radius: 50%;
          font-weight: 400;
          font-size: 11px;
          background-color: var(--primary-color);
          line-height: 16px;
          text-align: center;
          padding: 0px 2px;
          color: var(--text-primary-color);
        }
        .warning {
          color: var(--error-color);
        }
        ha-label {
          --ha-label-background-color: var(--color, var(--grey-color));
          --ha-label-background-opacity: 0.5;
        }
        .add {
          position: absolute;
          bottom: 0;
          right: 0;
          left: 0;
        }
        search-input-outlined {
          display: block;
          padding: 0 8px;
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
