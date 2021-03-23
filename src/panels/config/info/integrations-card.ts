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
  integrationName,
  fetchIntegrationManifests,
  integrationIssuesUrl,
  IntegrationManifest,
} from "../../../data/integration";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

@customElement("integrations-card")
class IntegrationsCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _manifests?: {
    [domain: string]: IntegrationManifest;
  };

  private _sortedIntegrations = memoizeOne((components: string[]) => {
    return components
      .map((comp) => (comp.includes(".") ? comp.split(".")[1] : comp))
      .sort()
      .filter((item, pos, ary) => !pos || item != ary[pos - 1]);
  });

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchManifests();
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
                      ${manifest
                        ? integrationName(this.hass.localize, manifest, domain)
                        : domainToName(this.hass.localize, domain)}<br />
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
                            : ""}
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
