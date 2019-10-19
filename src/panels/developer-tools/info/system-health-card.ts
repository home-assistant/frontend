import {
  LitElement,
  html,
  CSSResult,
  css,
  TemplateResult,
  property,
} from "lit-element";
import "@polymer/paper-spinner/paper-spinner";
import "../../../components/ha-card";

import { HomeAssistant } from "../../../types";
import {
  SystemHealthInfo,
  fetchSystemHealthInfo,
} from "../../../data/system_health";

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
  @property() public hass?: HomeAssistant;
  @property() private _info?: SystemHealthInfo;

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return;
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
            html`
              <h3>${this.hass.localize(`domain.${domain}`) || domain}</h3>
            `
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
      <ha-card header="System Health">
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
          error:
            "System Health component is not loaded. Add 'system_health:' to configuration.yaml",
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
