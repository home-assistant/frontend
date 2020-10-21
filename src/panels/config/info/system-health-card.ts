import "../../../components/ha-circular-progress";
import { mdiContentCopy } from "@mdi/js";
import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-card";
import "@polymer/paper-tooltip/paper-tooltip";
import type { PaperTooltipElement } from "@polymer/paper-tooltip/paper-tooltip";
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
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _info?: SystemHealthInfo;

  @query("paper-tooltip", true) private _toolTip?: PaperTooltipElement;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const sections: TemplateResult[] = [];

    if (!this._info) {
      sections.push(
        html`
          <div class="loading-container">
            <ha-circular-progress active></ha-circular-progress>
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
      <ha-card>
        <h1 class="card-header">
          <div class="card-header-text">
            ${domainToName(this.hass.localize, "system_health")}
          </div>
          <mwc-icon-button id="copy" @click=${this._copyInfo}>
            <ha-svg-icon .path=${mdiContentCopy}></ha-svg-icon>
          </mwc-icon-button>
          <paper-tooltip
            manual-mode
            for="copy"
            position="left"
            animation-delay="0"
            offset="4"
          >
            ${this.hass.localize("ui.common.copied")}
          </paper-tooltip>
        </h1>
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

  private _copyInfo(): void {
    const selection = window.getSelection()!;
    selection.removeAllRanges();

    const copyElement = this.shadowRoot?.querySelector(
      "ha-card"
    ) as HTMLElement;

    const range = document.createRange();
    range.selectNodeContents(copyElement);
    selection.addRange(range);

    document.execCommand("copy");
    window.getSelection()!.removeAllRanges();

    this._toolTip!.show();
    setTimeout(() => this._toolTip?.hide(), 3000);
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

      .card-header {
        justify-content: space-between;
        display: flex;
      }
    `;
  }
}

customElements.define("system-health-card", SystemHealthCard);
