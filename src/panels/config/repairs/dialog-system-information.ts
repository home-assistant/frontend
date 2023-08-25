import "@material/mwc-button/mwc-button";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { fireEvent } from "../../../common/dom/fire_event";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import { subscribePollingCollection } from "../../../common/util/subscribe-polling";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-metric";
import { fetchHassioStats, HassioStats } from "../../../data/hassio/common";
import {
  fetchHassioResolution,
  HassioResolution,
} from "../../../data/hassio/resolution";
import { domainToName } from "../../../data/integration";
import {
  subscribeSystemHealthInfo,
  SystemCheckValueObject,
  SystemHealthInfo,
} from "../../../data/system_health";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";

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

export const UNSUPPORTED_REASON_URL = {};
export const UNHEALTHY_REASON_URL = {
  privileged: "/more-info/unsupported/privileged",
};

@customElement("dialog-system-information")
class DialogSystemInformation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _systemInfo?: SystemHealthInfo;

  @state() private _resolutionInfo?: HassioResolution;

  @state() private _supervisorStats?: HassioStats;

  @state() private _coreStats?: HassioStats;

  @state() private _opened = false;

  private _systemHealthSubscription?: Promise<UnsubscribeFunc>;

  private _hassIOSubscription?: UnsubscribeFunc;

  public showDialog(): void {
    this._opened = true;
    this.hass!.loadBackendTranslation("system_health");
    this._subscribe();
  }

  public closeDialog() {
    this._opened = false;
    this._unsubscribe();
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _subscribe(): void {
    if (isComponentLoaded(this.hass, "system_health")) {
      this._systemHealthSubscription = subscribeSystemHealthInfo(
        this.hass,
        (info) => {
          if (!info) {
            this._systemHealthSubscription = undefined;
          } else {
            this._systemInfo = info;
          }
        }
      );
    }

    if (isComponentLoaded(this.hass, "hassio")) {
      this._hassIOSubscription = subscribePollingCollection(
        this.hass,
        async () => {
          this._supervisorStats = await fetchHassioStats(
            this.hass,
            "supervisor"
          );
          this._coreStats = await fetchHassioStats(this.hass, "core");
        },
        10000
      );

      fetchHassioResolution(this.hass).then((data) => {
        this._resolutionInfo = data;
      });
    }
  }

  private _unsubscribe() {
    this._systemHealthSubscription?.then((unsubFunc) => unsubFunc());
    this._systemHealthSubscription = undefined;
    this._hassIOSubscription?.();
    this._hassIOSubscription = undefined;

    this._systemInfo = undefined;
    this._resolutionInfo = undefined;
    this._coreStats = undefined;
    this._supervisorStats = undefined;
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }

    const sections = this._getSections();

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.repairs.system_information")
        )}
      >
        <div>
          ${this._resolutionInfo
            ? html`${this._resolutionInfo.unhealthy.length
                ? html`<ha-alert alert-type="error">
                    ${this.hass.localize("ui.dialogs.unhealthy.title")}
                    <mwc-button
                      slot="action"
                      .label=${this.hass.localize(
                        "ui.panel.config.common.learn_more"
                      )}
                      @click=${this._unhealthyDialog}
                    >
                    </mwc-button
                  ></ha-alert>`
                : ""}
              ${this._resolutionInfo.unsupported.length
                ? html`<ha-alert alert-type="warning">
                    ${this.hass.localize("ui.dialogs.unsupported.title")}
                    <mwc-button
                      slot="action"
                      .label=${this.hass.localize(
                        "ui.panel.config.common.learn_more"
                      )}
                      @click=${this._unsupportedDialog}
                    >
                    </mwc-button>
                  </ha-alert>`
                : ""} `
            : ""}

          <div>${sections}</div>

          ${!this._coreStats && !this._supervisorStats
            ? ""
            : html`
                <div>
                  ${this._coreStats
                    ? html`
                        <h3>
                          ${this.hass.localize(
                            "ui.panel.config.system_health.core_stats"
                          )}
                        </h3>
                        <ha-metric
                          .heading=${this.hass.localize(
                            "ui.panel.config.system_health.cpu_usage"
                          )}
                          .value=${this._coreStats.cpu_percent}
                        ></ha-metric>
                        <ha-metric
                          .heading=${this.hass.localize(
                            "ui.panel.config.system_health.ram_usage"
                          )}
                          .value=${this._coreStats.memory_percent}
                        ></ha-metric>
                      `
                    : ""}
                  ${this._supervisorStats
                    ? html`
                        <h3>
                          ${this.hass.localize(
                            "ui.panel.config.system_health.supervisor_stats"
                          )}
                        </h3>
                        <ha-metric
                          .heading=${this.hass.localize(
                            "ui.panel.config.system_health.cpu_usage"
                          )}
                          .value=${this._supervisorStats.cpu_percent}
                        ></ha-metric>
                        <ha-metric
                          .heading=${this.hass.localize(
                            "ui.panel.config.system_health.ram_usage"
                          )}
                          .value=${this._supervisorStats.memory_percent}
                        ></ha-metric>
                      `
                    : ""}
                </div>
              `}
        </div>
        <mwc-button
          slot="primaryAction"
          .label=${this.hass.localize("ui.panel.config.repairs.copy")}
          @click=${this._copyInfo}
        ></mwc-button>
      </ha-dialog>
    `;
  }

  private async _unsupportedDialog(): Promise<void> {
    await showAlertDialog(this, {
      title: this.hass.localize("ui.dialogs.unsupported.title"),
      text: html`${this.hass.localize("ui.dialogs.unsupported.description")}
        <br /><br />
        <ul>
          ${this._resolutionInfo!.unsupported.map(
            (reason) => html`
              <li>
                <a
                  href=${documentationUrl(
                    this.hass,
                    UNSUPPORTED_REASON_URL[reason] ||
                      `/more-info/unsupported/${reason}`
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass.localize(
                    `ui.dialogs.unsupported.reason.${reason}`
                  ) || reason}
                </a>
              </li>
            `
          )}
        </ul>`,
    });
  }

  private async _unhealthyDialog(): Promise<void> {
    await showAlertDialog(this, {
      title: this.hass.localize("ui.dialogs.unhealthy.title"),
      text: html`${this.hass.localize("ui.dialogs.unhealthy.description")}
        <br /><br />
        <ul>
          ${this._resolutionInfo!.unhealthy.map(
            (reason) => html`
              <li>
                <a
                  href=${documentationUrl(
                    this.hass,
                    UNHEALTHY_REASON_URL[reason] ||
                      `/more-info/unhealthy/${reason}`
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass.localize(
                    `ui.dialogs.unhealthy.reason.${reason}`
                  ) || reason}
                </a>
              </li>
            `
          )}
        </ul>`,
    });
  }

  private _getSections(): TemplateResult[] {
    const sections: TemplateResult[] = [];

    if (!this._systemInfo) {
      sections.push(html`
        <div class="loading-container">
          <ha-circular-progress active></ha-circular-progress>
        </div>
      `);
    } else {
      const domains = Object.keys(this._systemInfo).sort(sortKeys);
      for (const domain of domains) {
        const domainInfo = this._systemInfo[domain];
        const keys: TemplateResult[] = [];

        for (const key of Object.keys(domainInfo.info)) {
          let value: unknown;

          if (
            domainInfo.info[key] &&
            typeof domainInfo.info[key] === "object"
          ) {
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
              value = formatDateTime(
                new Date(info.value),
                this.hass.locale,
                this.hass.config
              );
            }
          } else {
            value = domainInfo.info[key];
          }

          keys.push(html`
            <tr>
              <td>
                ${this.hass.localize(
                  `component.${domain}.system_health.info.${key}`
                ) || key}
              </td>
              <td>${value}</td>
            </tr>
          `);
        }
        if (domain !== "homeassistant") {
          sections.push(html`
            <div class="card-header">
              <h3>${domainToName(this.hass.localize, domain)}</h3>
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
          `);
        }
        sections.push(html`
          <table>
            ${keys}
          </table>
        `);
      }
    }
    return sections;
  }

  private async _copyInfo(): Promise<void> {
    let haContent: string | undefined;
    const domainParts: string[] = [];

    for (const domain of Object.keys(this._systemInfo!).sort(sortKeys)) {
      const domainInfo = this._systemInfo![domain];
      let first = true;
      const parts = [
        `${
          domain !== "homeassistant"
            ? `<details><summary>${domainToName(
                this.hass.localize,
                domain
              )}</summary>\n`
            : ""
        }`,
      ];

      for (const key of Object.keys(domainInfo.info)) {
        let value: unknown;

        if (domainInfo.info[key] && typeof domainInfo.info[key] === "object") {
          const info = domainInfo.info[key] as SystemCheckValueObject;

          if (info.type === "pending") {
            value = "pending";
          } else if (info.type === "failed") {
            value = `failed to load: ${info.error}`;
          } else if (info.type === "date") {
            value = formatDateTime(
              new Date(info.value),
              this.hass.locale,
              this.hass.config
            );
          }
        } else {
          value = domainInfo.info[key];
        }
        if (first) {
          parts.push(`${key} | ${value}\n-- | --`);
          first = false;
        } else {
          parts.push(`${key} | ${value}`);
        }
      }

      if (domain === "homeassistant") {
        haContent = parts.join("\n");
      } else {
        domainParts.push(parts.join("\n"));
        if (domain !== "homeassistant") {
          domainParts.push("</details>");
        }
      }
    }

    await copyToClipboard(
      `${"## "}System Information\n${haContent}\n\n${domainParts.join("\n\n")}`
    );

    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  static styles: CSSResultGroup = [
    haStyleDialog,
    css`
      ha-alert {
        margin-bottom: 16px;
        display: block;
      }
      table {
        width: 100%;
      }

      td:first-child {
        width: 45%;
      }

      td:last-child {
        direction: ltr;
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

      a.manage {
        text-decoration: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-system-information": DialogSystemInformation;
  }
}
