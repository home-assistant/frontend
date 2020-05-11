import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import "../../../components/ha-card";
import {
  domainToName,
  fetchIntegrationManifests,
  integrationIssuesUrl,
  IntegrationManifest,
} from "../../../data/integration";
import { HomeAssistant } from "../../../types";

@customElement("integrations-card")
class IntegrationsCard extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() private _manifests?: { [domain: string]: IntegrationManifest };

  private _sortedIntegrations = memoizeOne((components: string[]) => {
    return components.filter((comp) => !comp.includes(".")).sort();
  });

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchManifests();
  }

  protected render(): TemplateResult {
    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.developer-tools.tabs.info.integrations"
        )}
      >
        <table class="card-content">
          <tbody>
            ${this._sortedIntegrations(this.hass!.config.components).map(
              (domain) => {
                const manifest = this._manifests && this._manifests[domain];
                return html`
                  <tr>
                    <td>
                      <img
                        loading="lazy"
                        src="https://brands.home-assistant.io/_/${domain}/icon.png"
                        referrerpolicy="no-referrer"
                      />
                    </td>
                    <td class="name">
                      ${domainToName(this.hass.localize, domain)}<br />
                      <span class="domain">${domain}</span>
                    </td>
                    ${!manifest
                      ? ""
                      : html`
                          <td>
                            <a
                              href=${manifest.documentation}
                              target="_blank"
                              rel="noreferrer"
                            >
                              ${this.hass.localize(
                                "ui.panel.developer-tools.tabs.info.documentation"
                              )}
                            </a>
                          </td>
                          ${!manifest.is_built_in
                            ? ""
                            : html`
                                <td>
                                  <a
                                    href=${integrationIssuesUrl(domain)}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    ${this.hass.localize(
                                      "ui.panel.developer-tools.tabs.info.issues"
                                    )}
                                  </a>
                                </td>
                              `}
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
