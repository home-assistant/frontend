import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import type { IntegrationManifest } from "../data/integration";
import { domainToName, fetchIntegrationManifests } from "../data/integration";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-check-list-item";
import "./ha-domain-icon";
import "./ha-expansion-panel";
import "./ha-list";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";

@customElement("ha-filter-integrations")
export class HaFilterIntegrations extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _manifests?: IntegrationManifest[];

  @state() private _shouldRender = false;

  @state() private _filter?: string;

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize("ui.panel.config.integrations.caption")}
          ${this.value?.length
            ? html`<div class="badge">${this.value?.length}</div>
                <ha-icon-button
                  .path=${mdiFilterVariantRemove}
                  @click=${this._clearFilter}
                ></ha-icon-button>`
            : nothing}
        </div>
        ${this._manifests && this._shouldRender
          ? html`<ha-input-search
                appearance="outlined"
                .value=${this._filter}
                @input=${this._handleSearchChange}
              >
              </ha-input-search>
              <ha-list
                class="ha-scrollbar"
                @selected=${this._itemSelected}
                multi
              >
                ${repeat(
                  this._integrations(
                    this.hass.localize,
                    this._manifests,
                    this._filter,
                    this.value
                  ),
                  (i) => i.domain,
                  (integration) =>
                    html`<ha-check-list-item
                      .value=${integration.domain}
                      .selected=${(this.value || []).includes(
                        integration.domain
                      )}
                      graphic="icon"
                    >
                      <ha-domain-icon
                        slot="graphic"
                        .domain=${integration.domain}
                        brand-fallback
                      ></ha-domain-icon>
                      ${integration.name}
                    </ha-check-list-item>`
                )}
              </ha-list> `
          : nothing}
      </ha-expansion-panel>
    `;
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this.renderRoot.querySelector("ha-list")!.style.height =
          `${this.clientHeight - 49 - 4 - 32}px`;
        // 49px - height of a header + 1px
        // 4px - padding-top of the search-input
        // 32px - height of the search input
      }, 300);
    }
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  protected async firstUpdated() {
    this._manifests = await fetchIntegrationManifests(this.hass);
    this.hass.loadBackendTranslation("title");
  }

  private _integrations = memoizeOne(
    (
      localize: LocalizeFunc,
      manifest: IntegrationManifest[],
      filter: string | undefined,
      _value
    ) =>
      manifest
        .map((mnfst) => ({
          ...mnfst,
          name: domainToName(localize, mnfst.domain, mnfst),
        }))
        .filter(
          (mnfst) =>
            (!mnfst.integration_type ||
              !["entity", "system", "hardware"].includes(
                mnfst.integration_type
              )) &&
            (!filter ||
              mnfst.name.toLowerCase().includes(filter) ||
              mnfst.domain.toLowerCase().includes(filter))
        )
        .sort((a, b) =>
          stringCompare(a.name, b.name, this.hass.locale.language)
        )
  );

  private _itemSelected(
    ev: CustomEvent<{ diff: { added: number[]; removed: number[] } }>
  ) {
    const integrations = this._integrations(
      this.hass.localize,
      this._manifests!,
      this._filter,
      this.value
    );

    if (ev.detail.diff.added.length) {
      this.value = [
        ...(this.value || []),
        integrations[ev.detail.diff.added[0]].domain,
      ];
    } else if (ev.detail.diff.removed.length) {
      const removedDomain = integrations[ev.detail.diff.removed[0]].domain;
      this.value = this.value?.filter((val) => val !== removedDomain);
    }

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
        ha-check-list-item {
          --mdc-list-item-graphic-margin: var(--ha-space-4);
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
    "ha-filter-integrations": HaFilterIntegrations;
  }
}
