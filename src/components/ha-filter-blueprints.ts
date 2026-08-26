import type { SelectedDetail } from "@material/mwc-list";
import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import { fireEvent } from "../common/dom/fire_event";
import { deepEqual } from "../common/util/deep-equal";
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

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false }) public value?: string[];

  @property() public type?: "automation" | "script";

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _blueprints?: Blueprints;

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  public willUpdate(properties: PropertyValues<this>) {
    super.willUpdate(properties);

    if (
      properties.has("value") &&
      !deepEqual(this.value, properties.get("value"))
    ) {
      this._findRelated();
    }
  }

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._localize("ui.panel.config.blueprint.caption")}
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
                ${
                  this._blueprints
                    ? html`
                        <ha-list
                          @selected=${this._blueprintsSelected}
                          multi
                          class="ha-scrollbar"
                        >
                          ${Object.entries(this._blueprints).map(
                            ([id, blueprint]) =>
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
                    : nothing
                }
              </div>
            `
          : nothing
      }
    `;
  }

  protected async firstUpdated() {
    if (!this.type) {
      return;
    }
    this._blueprints = await fetchBlueprints(this.hass, this.type);
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private async _blueprintsSelected(
    ev: CustomEvent<SelectedDetail<Set<number>>>
  ) {
    const blueprints = this._blueprints!;

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
    }

    this.value = value;
  }

  private async _findRelated() {
    if (!this.value?.length) {
      this.value = [];
      fireEvent(this, "data-table-filter-changed", {
        value: [],
        items: undefined,
      });
      return;
    }

    const relatedPromises: Promise<RelatedResult>[] = [];

    for (const blueprintId of this.value) {
      if (this.type) {
        relatedPromises.push(
          findRelated(this.hass, `${this.type}_blueprint`, blueprintId)
        );
      }
    }

    const results = await Promise.all(relatedPromises);
    const items = new Set<string>();
    for (const result of results) {
      if (result[this.type!]) {
        result[this.type!]!.forEach((item) => items.add(item));
      }
    }

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
    "ha-filter-blueprints": HaFilterBlueprints;
  }
}
