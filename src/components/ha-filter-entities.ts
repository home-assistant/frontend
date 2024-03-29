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
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import { stringCompare } from "../common/string/compare";
import { findRelated, RelatedResult } from "../data/search";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-state-icon";
import "./ha-check-list-item";
import { loadVirtualizer } from "../resources/virtualizer";

@customElement("ha-filter-entities")
export class HaFilterEntities extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property() public type?: keyof RelatedResult;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

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
          ${this.hass.localize("ui.panel.config.entities.caption")}
          ${this.value?.length
            ? html`<div class="badge">${this.value?.length}</div>`
            : nothing}
        </div>
        ${this._shouldRender
          ? html`
              <mwc-list class="ha-scrollbar">
                <lit-virtualizer
                  .items=${this._entities(this.hass.states, this.type)}
                  .renderItem=${this._renderItem}
                  @click=${this._handleItemClick}
                >
                </lit-virtualizer>
              </mwc-list>
            `
          : nothing}
      </ha-expansion-panel>
    `;
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

  private _renderItem = (entity) =>
    html`<ha-check-list-item
      .value=${entity.entity_id}
      .selected=${this.value?.includes(entity.entity_id)}
      graphic="icon"
    >
      <ha-state-icon
        slot="graphic"
        .hass=${this.hass}
        .stateObj=${entity}
      ></ha-state-icon>
      ${computeStateName(entity)}
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

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _entities = memoizeOne(
    (states: HomeAssistant["states"], type: this["type"]) => {
      const values = Object.values(states);
      return values
        .filter(
          (entityState) => !type || computeStateDomain(entityState) !== type
        )
        .sort((a, b) =>
          stringCompare(
            computeStateName(a),
            computeStateName(b),
            this.hass.locale.language
          )
        );
    }
  );

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

    for (const entityId of this.value) {
      value.push(entityId);
      if (this.type) {
        relatedPromises.push(findRelated(this.hass, "entity", entityId));
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
          --mdc-list-item-graphic-margin: 16px;
          width: 100%;
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
