import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button";
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
  subscribeSystemHealthInfo,
  SystemHealthInfo,
  SystemCheckValueObject,
} from "../../../data/system_health";
import { HomeAssistant } from "../../../types";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { copyToClipboard } from "../../../common/util/copy-clipboard";

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
        const domainInfo = this._info[domain];
        const keys: TemplateResult[] = [];

        for (const key of Object.keys(domainInfo.info)) {
          let value: unknown;

          if (typeof domainInfo.info[key] === "object") {
            const info = domainInfo.info[key] as SystemCheckValueObject;

            if (info.type === "pending") {
              value = html`
                <ha-circular-progress active size="tiny"></ha-circular-progress>
              `;
            } else if (info.type === "failed") {
              value = html`
                <span class="error">${info.error}</span>${!info.more_info
                  ? ""
                  : html`
                      –
                      <a
                        href=${info.more_info}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        ${this.hass.localize(
                          "ui.panel.config.info.system_health.more_info"
                        )}
                      </a>
                    `}
              `;
            } else if (info.type === "date") {
              value = formatDateTime(new Date(info.value), this.hass.language);
            }
          } else {
            value = domainInfo.info[key];
          }

          keys.push(html`
            <tr>
              <td>
                ${this.hass.localize(
                  `ui.panel.config.info.system_health.checks.${domain}.${key}`
                ) || key}
              </td>
              <td>${value}</td>
            </tr>
          `);
        }
        if (domain !== "homeassistant") {
          sections.push(
            html`
              <div class="card-header">
                <h3>
                  ${domainToName(this.hass.localize, domain)}
                </h3>
                ${!domainInfo.manage_url
                  ? ""
                  : html`
                      <a class="manage" href=${domainInfo.manage_url}>
                        <mwc-button>
                          ${this.hass.localize(
                            "ui.panel.config.info.system_health.manage"
                          )}
                        </mwc-button>
                      </a>
                    `}
              </div>
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

    if (!this.hass!.config.components.includes("system_health")) {
      this._info = {
        system_health: {
          info: {
            error: this.hass.localize(
              "ui.panel.config.info.system_health_error"
            ),
          },
        },
      };
      return;
    }

    subscribeSystemHealthInfo(this.hass!, (info) => {
      this._info = info;
    });
  }

  private _copyInfo(): void {
    let haContent: string | undefined;
    const domainParts: string[] = [];

    for (const domain of Object.keys(this._info!).sort(sortKeys)) {
      const domainInfo = this._info![domain];
      const parts = [`${domainToName(this.hass.localize, domain)}\n`];

      for (const key of Object.keys(domainInfo.info)) {
        let value: unknown;

        if (typeof domainInfo.info[key] === "object") {
          const info = domainInfo.info[key] as SystemCheckValueObject;

          if (info.type === "pending") {
            value = "pending";
          } else if (info.type === "failed") {
            value = `failed to load: ${info.error}`;
          } else if (info.type === "date") {
            value = formatDateTime(new Date(info.value), this.hass.language);
          }
        } else {
          value = domainInfo.info[key];
        }

        parts.push(`${key}: ${value}`);
      }

      if (domain === "homeassistant") {
        haContent = parts.join("\n");
      } else {
        domainParts.push(parts.join("\n"));
      }
    }

    copyToClipboard(
      `System Health\n\n${haContent}\n\n${domainParts.join("\n\n")}`
    );

    this._toolTip!.show();
    setTimeout(() => this._toolTip?.hide(), 3000);
  }

  static get styles(): CSSResult {
    return css`
      table {
        width: 100%;
      }

      td:first-child {
        width: 45%;
      }

      .loading-container {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .card-header {
        justify-content: space-between;
        display: flex;
        align-items: center;
      }

      .error {
        color: var(--error-color);
      }

      a {
        color: var(--primary-color);
      }

      a.manage {
        text-decoration: none;
      }
    `;
  }
}

customElements.define("system-health-card", SystemHealthCard);
