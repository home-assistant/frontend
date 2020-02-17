import {
  LitElement,
  property,
  TemplateResult,
  html,
  customElement,
  CSSResult,
  css,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import memoizeOne from "memoize-one";
import {
  integrationDocsUrl,
  integrationIssuesUrl,
} from "../../../data/integration";

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
                  <td>${domain}</td>
                  <td>
                    <a href=${integrationDocsUrl(domain)} target="_blank">
                      Documentation
                    </a>
                  </td>
                  <td>
                    <a href=${integrationIssuesUrl(domain)} target="_blank">
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
