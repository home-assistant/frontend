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
import {
  integrationDocsUrl,
  integrationIssuesUrl,
} from "../../../data/integration";
import { HomeAssistant } from "../../../types";

@customElement("integrations-card")
class IntegrationsCard extends LitElement {
  @property() public hass!: HomeAssistant;

  private _sortedIntegrations = memoizeOne((components: string[]) => {
    return components.filter((comp) => !comp.includes(".")).sort();
  });

  protected render(): TemplateResult {
    return html`
      <ha-card header="Integrations">
        <table class="card-content">
          <tbody>
            ${this._sortedIntegrations(this.hass!.config.components).map(
              (domain) => html`
                <tr>
                  <td>
                    <img
                      loading="lazy"
                      src="https://brands.home-assistant.io/_/${domain}/icon.png"
                      referrerpolicy="no-referrer"
                    />
                  </td>
                  <td>${domain}</td>
                  <td>
                    <a
                      href=${integrationDocsUrl(domain)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Documentation
                    </a>
                  </td>
                  <td>
                    <a
                      href=${integrationIssuesUrl(domain)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Issues
                    </a>
                  </td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      td {
        line-height: 2em;
        padding: 0 8px;
      }
      td:first-child {
        padding-left: 0;
      }
      img {
        display: block;
        max-height: 24px;
        max-width: 24px;
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
