import "@polymer/paper-spinner/paper-spinner";
import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-card";
import { domainToName } from "../../../data/integration";
import {
  fetchSystemHealthInfo,
  SystemHealthInfo,
} from "../../../data/system_health";
import { HomeAssistant } from "../../../types";

const sortKeys = (a: string, b: string) => {
  if (a === "homeassistant") {
    return -1;
  }
  if (b === "homeassistant") {
    return 1;
  }
  if (a < b) {
    return -1;
  }
  if (b < a) {
    return 1;
  }
  return 0;
};

class SystemHealthCard extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() private _info?: SystemHealthInfo;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const sections: TemplateResult[] = [];

    if (!this._info) {
      sections.push(
        html`
          <div class="loading-container">
            <paper-spinner active></paper-spinner>
          </div>
        `
      );
    } else {
      const domains = Object.keys(this._info).sort(sortKeys);
      for (const domain of domains) {
        const keys: TemplateResult[] = [];

        for (const key of Object.keys(this._info[domain]).sort()) {
          keys.push(html`
            <tr>
              <td>${key}</td>
              <td>${this._info[domain][key]}</td>
            </tr>
          `);
        }
        if (domain !== "homeassistant") {
          sections.push(
            html` <h3>${domainToName(this.hass.localize, domain)}</h3> `
          );
        }
        sections.push(html`
          <table>
            ${keys}
          </table>
        `);
      }
    }

    return html`
      <ha-card .header=${domainToName(this.hass.localize, "system_health")}>
        <div class="card-content">${sections}</div>
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchInfo();
  }

  private async _fetchInfo() {
    try {
      if (!this.hass!.config.components.includes("system_health")) {
        throw new Error();
      }
      this._info = await fetchSystemHealthInfo(this.hass!);
    } catch (err) {
      this._info = {
        system_health: {
          error: this.hass.localize("ui.panel.config.info.system_health_error"),
        },
      };
    }
  }

  static get styles(): CSSResult {
    return css`
      table {
        width: 100%;
      }

      td:first-child {
        width: 33%;
      }

      .loading-container {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
  }
}

customElements.define("system-health-card", SystemHealthCard);
