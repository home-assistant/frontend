import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../components/ha-card";
import {
  domainToName,
  fetchIntegrationManifests,
  fetchIntegrationSetups,
  integrationIssuesUrl,
  IntegrationManifest,
  IntegrationSetup,
} from "../../../data/integration";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

@customElement("integrations-card")
class IntegrationsCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _manifests?: {
    [domain: string]: IntegrationManifest;
  };

  @state() private _setups?: {
    [domain: string]: IntegrationSetup;
  };

  private _sortedIntegrations = memoizeOne((components: string[]) =>
    Array.from(
      new Set(
        components.map((comp) =>
          comp.includes(".") ? comp.split(".")[1] : comp
        )
      )
    ).sort()
  );

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchManifests();
    this._fetchSetups();
  }

  protected render(): TemplateResult {
    return html`
      <ha-card
        .header=${this.hass.localize("ui.panel.config.info.integrations")}
      >
        <table class="card-content">
          <thead>
            <tr>
              <th></th>
              ${!this.narrow
                ? html`<th></th>
                    <th></th>
                    <th></th>`
                : ""}
              <th>${this.hass.localize("ui.panel.config.info.setup_time")}</th>
            </tr>
          </thead>
          <tbody>
            ${this._sortedIntegrations(this.hass!.config.components).map(
              (domain) => {
                const manifest = this._manifests && this._manifests[domain];
                const docLink = manifest
                  ? html`<a
                      href=${manifest.documentation}
                      target="_blank"
                      rel="noreferrer"
                      >${this.hass.localize(
                        "ui.panel.config.info.documentation"
                      )}</a
                    >`
                  : "";
                const issueLink =
                  manifest && (manifest.is_built_in || manifest.issue_tracker)
                    ? html`
                        <a
                          href=${integrationIssuesUrl(domain, manifest)}
                          target="_blank"
                          rel="noreferrer"
                          >${this.hass.localize(
                            "ui.panel.config.info.issues"
                          )}</a
                        >
                      `
                    : "";
                const setupSeconds =
                  this._setups?.[domain]?.seconds?.toFixed(2);
                return html`
                  <tr>
                    <td>
                      <img
                        loading="lazy"
                        src=${brandsUrl({
                          domain: domain,
                          type: "icon",
                          useFallback: true,
                          darkOptimized: this.hass.selectedTheme?.dark,
                        })}
                        referrerpolicy="no-referrer"
                      />
                    </td>
                    <td class="name">
                      ${domainToName(
                        this.hass.localize,
                        domain,
                        manifest
                      )}<br />
                      <span class="domain">${domain}</span>
                      ${this.narrow
                        ? html`<div class="mobile-row">
                            <div>${docLink} ${issueLink}</div>
                            ${setupSeconds ? html`${setupSeconds} s` : ""}
                          </div>`
                        : ""}
                    </td>
                    ${this.narrow
                      ? ""
                      : html`
                          <td>${docLink}</td>
                          <td>${issueLink}</td>
                          <td class="setup">
                            ${setupSeconds ? html`${setupSeconds} s` : ""}
                          </td>
                        `}
                  </tr>
                `;
              }
            )}
          </tbody>
        </table>
      </ha-card>
    `;
  }

  private async _fetchManifests() {
    const manifests = {};
    for (const manifest of await fetchIntegrationManifests(this.hass)) {
      manifests[manifest.domain] = manifest;
    }
    this._manifests = manifests;
  }

  private async _fetchSetups() {
    const setups = {};
    for (const setup of await fetchIntegrationSetups(this.hass)) {
      setups[setup.domain] = setup;
    }
    this._setups = setups;
  }

  static get styles(): CSSResultGroup {
    return css`
      table {
        width: 100%;
      }
      td,
      th {
        padding: 0 8px;
      }
      td:first-child {
        padding-left: 0;
      }
      td.name {
        padding: 8px;
      }
      td.setup {
        text-align: right;
        white-space: nowrap;
      }
      th {
        text-align: right;
      }
      .domain {
        color: var(--secondary-text-color);
      }
      .mobile-row {
        display: flex;
        justify-content: space-between;
      }
      .mobile-row a:not(:last-of-type) {
        margin-right: 4px;
      }
      img {
        display: block;
        max-height: 40px;
        max-width: 40px;
      }
      a {
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "integrations-card": IntegrationsCard;
  }
}
