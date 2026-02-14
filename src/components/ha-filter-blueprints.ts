import type { SelectedDetail } from "@material/mwc-list";
import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeKeys } from "../common/translations/localize";
import { deepEqual } from "../common/util/deep-equal";
import { FILTER_NONE_OF_LISTED } from "../common/const";
import type { Blueprints } from "../data/blueprint";
import { fetchBlueprints } from "../data/blueprint";
import type { RelatedResult } from "../data/search";
import { findRelated } from "../data/search";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-check-list-item";
import "./ha-expansion-panel";
import "./ha-icon-button";
import "./ha-list";

@customElement("ha-filter-blueprints")
export class HaFilterBlueprints extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property() public type?: "automation" | "script";

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _shouldRender = false;

  @state() private _blueprints?: Blueprints;

  public willUpdate(properties: PropertyValues) {
    super.willUpdate(properties);

    if (
      properties.has("value") &&
      !deepEqual(this.value, properties.get("value"))
    ) {
      // eslint-disable-next-line no-console
      console.log("BF: willUpdate", this.value, properties.get("value"));
      this._findRelated();
    }
  }

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize("ui.panel.config.blueprint.caption")}
          ${this.value?.length
            ? html`<div class="badge">${this.value?.length}</div>
                <ha-icon-button
                  .path=${mdiFilterVariantRemove}
                  @click=${this._clearFilter}
                ></ha-icon-button>`
            : nothing}
        </div>
        ${this._blueprints && this._shouldRender
          ? html`
              <ha-list
                @selected=${this._blueprintsSelected}
                multi
                class="ha-scrollbar"
              >
                <ha-check-list-item
                  .value=${FILTER_NONE_OF_LISTED}
                  .selected=${this.value?.[0] === FILTER_NONE_OF_LISTED}
                >
                  <div class="none-of-listed">
                    ${this.hass.localize(
                      `ui.panel.config.blueprint.${FILTER_NONE_OF_LISTED}` as LocalizeKeys
                    )}
                  </div>
                </ha-check-list-item>
                ${Object.entries(this._blueprints).map(([id, blueprint]) =>
                  "error" in blueprint
                    ? nothing
                    : html`<ha-check-list-item
                        .value=${id}
                        .selected=${(this.value || []).includes(id)}
                      >
                        ${blueprint.metadata.name || id}
                      </ha-check-list-item>`
                )}
              </ha-list>
            `
          : nothing}
      </ha-expansion-panel>
    `;
  }

  protected async firstUpdated() {
    if (!this.type) {
      return;
    }
    this._blueprints = await fetchBlueprints(this.hass, this.type);
  }

  protected updated(changed) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (this.narrow || !this.expanded) return;
        this.renderRoot.querySelector("ha-list")!.style.height =
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

  private async _blueprintsSelected(
    ev: CustomEvent<SelectedDetail<Set<number>>>
  ) {
    let value;
    if ([...ev.detail.index][ev.detail.index.size - 1] === 0) {
      value = [...[FILTER_NONE_OF_LISTED]];
      // eslint-disable-next-line no-console
      console.log("BF: _blueprintsSelected (1)", ev.detail.index);
    } else {
      // eslint-disable-next-line no-console
      console.log("BF: _blueprintsSelected (2)", ev.detail.index);

      const blueprints = this._blueprints!;

      if (!ev.detail.index.size) {
        // eslint-disable-next-line no-console
        console.log("BF: _blueprintsSelected: push []");
        fireEvent(this, "data-table-filter-changed", {
          value: [],
          items: undefined,
        });
        this.value = [];
        return;
      }

      value = [];

      for (const index of ev.detail.index) {
        if (index !== 0) {
          const blueprintId = Object.keys(blueprints)[index - 1];
          value.push(blueprintId);
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log("BF: _blueprintsSelected", value);
    this.value = value;
  }

  private async _findRelated() {
    if (!this.value?.length) {
      // eslint-disable-next-line no-console
      console.log("BF: _findRelated: push []");
      this.value = [];
      fireEvent(this, "data-table-filter-changed", {
        value: [],
        items: undefined,
      });
      return;
    }

    let items;
    // eslint-disable-next-line no-console
    console.log("BF: _findRelated:", this.value);
    if (this.value[0] !== FILTER_NONE_OF_LISTED) {
      const relatedPromises: Promise<RelatedResult>[] = [];

      for (const blueprintId of this.value) {
        if (this.type) {
          relatedPromises.push(
            findRelated(this.hass, `${this.type}_blueprint`, blueprintId)
          );
        }
      }

      const results = await Promise.all(relatedPromises);
      const itms = new Set<string>();
      for (const result of results) {
        if (result[this.type!]) {
          result[this.type!]!.forEach((item) => itms.add(item));
        }
      }
      items = [...itms];
    } else {
      items = undefined; // ????
    }
    // eslint-disable-next-line no-console
    console.log("BF: _findRelated: items:", items);

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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-blueprints": HaFilterBlueprints;
  }
}
