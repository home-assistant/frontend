import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup } from "lit";
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
import "./search-input-outlined";

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
          ? html`<search-input-outlined
                .hass=${this.hass}
                .filter=${this._filter}
                @value-changed=${this._handleSearchChange}
              >
              </search-input-outlined>
              <ha-list
                class="ha-scrollbar"
                @click=${this._handleItemClick}
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
                        .hass=${this.hass}
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

  protected updated(changed) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this.renderRoot.querySelector("ha-list")!.style.height =
          `${this.clientHeight - 49 - 32}px`; // 32px is the height of the search input
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

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value.toLowerCase();
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
    "ha-filter-integrations": HaFilterIntegrations;
  }
}
