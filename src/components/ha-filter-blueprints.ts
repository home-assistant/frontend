import { SelectedDetail } from "@material/mwc-list";
import "@material/mwc-menu/mwc-menu-surface";
import { mdiFilterVariantRemove } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { Blueprints, fetchBlueprints } from "../data/blueprint";
import { findRelated, RelatedResult } from "../data/search";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";

@customElement("ha-filter-blueprints")
export class HaFilterBlueprints extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property() public type?: "automation" | "script";

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _shouldRender = false;

  @state() private _blueprints?: Blueprints;

  protected render() {
    return html`
      <ha-expansion-panel
        leftChevron
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
              <mwc-list
                @selected=${this._blueprintsSelected}
                multi
                class="ha-scrollbar"
              >
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
              </mwc-list>
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

  private async _blueprintsSelected(
    ev: CustomEvent<SelectedDetail<Set<number>>>
  ) {
    const blueprints = this._blueprints!;
    const relatedPromises: Promise<RelatedResult>[] = [];

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
      const blueprintId = Object.keys(blueprints)[index];
      value.push(blueprintId);
      if (this.type) {
        relatedPromises.push(
          findRelated(this.hass, `${this.type}_blueprint`, blueprintId)
        );
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-blueprints": HaFilterBlueprints;
  }
}
