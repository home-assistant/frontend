import { SelectedDetail } from "@material/mwc-list";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import {
  fetchIntegrationManifests,
  IntegrationManifest,
} from "../data/integration";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-domain-icon";

@customElement("ha-filter-integrations")
export class HaFilterIntegrations extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _manifests?: IntegrationManifest[];

  @state() private _shouldRender = false;

  protected render() {
    return html`
      <ha-expansion-panel
        leftChevron
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize("ui.panel.config.integrations.caption")}
          ${this.value?.length
            ? html`<div class="badge">${this.value?.length}</div>`
            : nothing}
        </div>
        ${this._manifests && this._shouldRender
          ? html`
              <mwc-list
                @selected=${this._integrationsSelected}
                multi
                class="ha-scrollbar"
              >
                ${repeat(
                  this._integrations(this._manifests, this.value),
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
                        brandFallback
                      ></ha-domain-icon>
                      ${integration.name || integration.domain}
                    </ha-check-list-item>`
                )}
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

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  protected async firstUpdated() {
    this._manifests = await fetchIntegrationManifests(this.hass);
  }

  private _integrations = memoizeOne(
    (manifest: IntegrationManifest[], _value) =>
      manifest
        .filter(
          (mnfst) =>
            !mnfst.integration_type ||
            !["entity", "system", "hardware"].includes(mnfst.integration_type)
        )
        .sort((a, b) =>
          stringCompare(
            a.name || a.domain,
            b.name || b.domain,
            this.hass.locale.language
          )
        )
  );

  private async _integrationsSelected(
    ev: CustomEvent<SelectedDetail<Set<number>>>
  ) {
    const integrations = this._integrations(this._manifests!);

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
      const domain = integrations[index].domain;
      value.push(domain);
    }
    this.value = value;

    fireEvent(this, "data-table-filter-changed", {
      value,
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
    "ha-filter-integrations": HaFilterIntegrations;
  }
}
