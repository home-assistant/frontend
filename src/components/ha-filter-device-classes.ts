import type { SelectedDetail } from "@material/mwc-list";
import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-check-list-item";
import "./ha-expansion-panel";
import "./ha-list";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";

const deviceClassToName = (deviceClass: string): string =>
  deviceClass.charAt(0).toUpperCase() + deviceClass.slice(1).replace(/_/g, " ");

@customElement("ha-filter-device-classes")
export class HaFilterDeviceClasses extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _shouldRender = false;

  @state() private _filter?: string;

  @query("ha-list") private _list?: HTMLElement;

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize("ui.panel.history.filter.device_class")}
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
                class="ha-scrollbar"
                @selected=${this._handleItemSelected}
                multi
              >
                ${repeat(
                  this._deviceClasses(this.hass.states, this._filter),
                  (i) => i,
                  (deviceClass) =>
                    html`<ha-check-list-item
                      .value=${deviceClass}
                      .selected=${(this.value || []).includes(deviceClass)}
                    >
                      ${deviceClassToName(deviceClass)}
                    </ha-check-list-item>`
                )}
              </ha-list> `
          : nothing}
      </ha-expansion-panel>
    `;
  }

  private _deviceClasses = memoizeOne(
    (states: HomeAssistant["states"], filter?: string) => {
      const deviceClasses = new Set<string>();
      Object.values(states).forEach((stateObj) => {
        const deviceClass = stateObj.attributes.device_class;
        if (deviceClass) {
          deviceClasses.add(deviceClass);
        }
      });

      return Array.from(deviceClasses.values())
        .filter(
          (deviceClass) =>
            !filter ||
            deviceClass.toLowerCase().includes(filter) ||
            deviceClassToName(deviceClass).toLowerCase().includes(filter)
        )
        .sort((a, b) =>
          stringCompare(
            deviceClassToName(a),
            deviceClassToName(b),
            this.hass.locale.language
          )
        );
    }
  );

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this._list!.style.height = `${this.clientHeight - 49 - 4 - 32}px`;
      }, 300);
    }
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleItemSelected(ev: CustomEvent<SelectedDetail<Set<number>>>) {
    const deviceClasses = this._deviceClasses(this.hass.states, this._filter);

    const visible = new Set(deviceClasses);
    const preserved = (this.value || []).filter((d) => !visible.has(d));
    const selected = [...ev.detail.index]
      .map((i) => deviceClasses[i])
      .filter((d): d is string => !!d);

    this.value = [...preserved, ...selected];

    fireEvent(this, "data-table-filter-changed", {
      value: this.value.length ? this.value : undefined,
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

  private _handleSearchChange(ev: InputEvent) {
    const target = ev.target as HaInputSearch;
    this._filter = (target.value ?? "").toLowerCase();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
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
    "ha-filter-device-classes": HaFilterDeviceClasses;
  }
}
