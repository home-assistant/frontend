import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
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

  @internalProperty() private _manifests?: {
    [domain: string]: IntegrationManifest;
  };

  @internalProperty() private _setups?: {
    [domain: string]: IntegrationSetup;
  };

  private _sortedIntegrations = memoizeOne((components: string[]) => {
    return Array.from(
      new Set(
        components.map((comp) =>
          comp.includes(".") ? comp.split(".")[1] : comp
        )
      )
    ).sort();
  });

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
          <tbody>
            ${this._sortedIntegrations(this.hass!.config.components).map(
              (domain) => {
                const manifest = this._manifests && this._manifests[domain];
                const setup = this._setups && this._setups[domain];
                return html`
                  <tr>
                    <td>
                      <img
                        loading="lazy"
                        src=${brandsUrl(domain, "icon", true)}
                        referrerpolicy="no-referrer"
                      />
                    </td>
                    <td class="name">
                      ${domainToName(this.hass.localize, domain, manifest)}<br />
                      <span class="domain">${domain}</span>
                    </td>
                    ${!manifest
                      ? html`<td></td>
                          <td></td>`
                      : html`
                          <td>
                            <a
                              href=${manifest.documentation}
                              target="_blank"
                              rel="noreferrer"
                            >
                              ${this.hass.localize(
                                "ui.panel.config.info.documentation"
                              )}
                            </a>
                          </td>
                          ${manifest.is_built_in || manifest.issue_tracker
                            ? html`
                                <td>
                                  <a
                                    href=${integrationIssuesUrl(
                                      domain,
                                      manifest
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    ${this.hass.localize(
                                      "ui.panel.config.info.issues"
                                    )}
                                  </a>
                                </td>
                              `
                            : html`<td></td>`}
                        `}
                    ${setup?.seconds
                      ? html`<td>${setup.seconds.toFixed(2)}s</td>`
                      : html`<td></td>`}
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

  static get styles(): CSSResult {
    return css`
      td {
        padding: 0 8px;
      }
      td:first-child {
        padding-left: 0;
      }
      td.name {
        padding: 8px;
      }
      .domain {
        color: var(--secondary-text-color);
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
