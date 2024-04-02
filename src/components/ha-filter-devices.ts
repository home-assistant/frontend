import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import { computeDeviceName } from "../data/device_registry";
import { findRelated, RelatedResult } from "../data/search";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-expansion-panel";
import "./ha-check-list-item";
import { loadVirtualizer } from "../resources/virtualizer";

@customElement("ha-filter-devices")
export class HaFilterDevices extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property() public type?: keyof RelatedResult;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @property({ type: Boolean }) public narrow = false;

  @state() private _shouldRender = false;

  public willUpdate(properties: PropertyValues) {
    super.willUpdate(properties);

    if (!this.hasUpdated) {
      loadVirtualizer();
    }
  }

  protected render() {
    return html`
      <ha-expansion-panel
        leftChevron
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize("ui.panel.config.devices.caption")}
          ${this.value?.length
            ? html`<div class="badge">${this.value?.length}</div>`
            : nothing}
        </div>
        ${this._shouldRender
          ? html`<mwc-list class="ha-scrollbar">
              <lit-virtualizer
                .items=${this._devices(this.hass.devices, this.value)}
                .keyFunction=${this._keyFunction}
                .renderItem=${this._renderItem}
                @click=${this._handleItemClick}
              >
              </lit-virtualizer>
            </mwc-list>`
          : nothing}
      </ha-expansion-panel>
    `;
  }

  private _keyFunction = (device) => device?.id;

  private _renderItem = (device) =>
    html`<ha-check-list-item
      .value=${device.id}
      .selected=${this.value?.includes(device.id)}
    >
      ${computeDeviceName(device, this.hass)}
    </ha-check-list-item>`;

  private _handleItemClick(ev) {
    const listItem = ev.target.closest("ha-check-list-item");
    const value = listItem?.value;
    if (!value) {
      return;
    }
    if (this.value?.includes(value)) {
      this.value = this.value?.filter((val) => val !== value);
    } else {
      this.value = [...(this.value || []), value];
    }
    listItem.selected = this.value?.includes(value);
    this._findRelated();
  }

  protected updated(changed) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this.renderRoot.querySelector("mwc-list")!.style.height =
          `${this.clientHeight - 49}px`;
      }, 300);
    }
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _devices = memoizeOne((devices: HomeAssistant["devices"], _value) => {
    const values = Object.values(devices);
    return values.sort((a, b) =>
      stringCompare(
        a.name_by_user || a.name || "",
        b.name_by_user || b.name || "",
        this.hass.locale.language
      )
    );
  });

  private async _findRelated() {
    const relatedPromises: Promise<RelatedResult>[] = [];

    if (!this.value?.length) {
      fireEvent(this, "data-table-filter-changed", {
        value: [],
        items: undefined,
      });
      this.value = [];
      return;
    }

    const value: string[] = [];

    for (const deviceId of this.value) {
      value.push(deviceId);
      if (this.type) {
        relatedPromises.push(findRelated(this.hass, "device", deviceId));
      }
    }
    this.value = value;
    const results = await Promise.all(relatedPromises);
    const items: Set<string> = new Set();
    for (const result of results) {
      if (result[this.type!]) {
        result[this.type!]!.forEach((item) => items.add(item));
      }
    }

    fireEvent(this, "data-table-filter-changed", {
      value,
      items: this.type ? items : undefined,
    });
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
          --ha-card-border-radius: 0;
          --expansion-panel-content-padding: 0;
        }
        .header {
          display: flex;
          align-items: center;
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
        ha-check-list-item {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-devices": HaFilterDevices;
  }
}
