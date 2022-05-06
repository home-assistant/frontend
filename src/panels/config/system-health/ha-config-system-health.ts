import { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiContentCopy } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket/dist/types";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import { subscribePollingCollection } from "../../../common/util/subscribe-polling";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
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
import "../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import "./integrations-card";

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

@customElement("ha-config-system-health")
class HaConfigSystemHealth extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _info?: SystemHealthInfo;

  @state() private _supervisorStats?: HassioStats;

  @state() private _resolutionInfo?: HassioResolution;

  @state() private _coreStats?: HassioStats;

  @state() private _error?: { code: string; message: string };

  public hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> {
    const subs: Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> = [];
    if (isComponentLoaded(this.hass, "system_health")) {
      subs.push(
        subscribeSystemHealthInfo(this.hass!, (info) => {
          this._info = info;
        })
      );
    }

    if (isComponentLoaded(this.hass, "hassio")) {
      subs.push(
        subscribePollingCollection(
          this.hass,
          async () => {
            this._supervisorStats = await fetchHassioStats(
              this.hass,
              "supervisor"
            );
            this._coreStats = await fetchHassioStats(this.hass, "core");
          },
          10000
        )
      );
      fetchHassioResolution(this.hass).then((data) => {
        this._resolutionInfo = data;
      });
    }

    return subs;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    this.hass!.loadBackendTranslation("system_health");
  }

  protected render(): TemplateResult {
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
              value = formatDateTime(new Date(info.value), this.hass.locale);
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
          sections.push(
            html`
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
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/system"
        .header=${this.hass.localize("ui.panel.config.system_health.caption")}
      >
        ${this._error
          ? html`
              <ha-alert alert-type="error"
                >${this._error.message || this._error.code}</ha-alert
              >
            `
          : ""}
        ${this._info
          ? html`
              <ha-button-menu
                corner="BOTTOM_START"
                slot="toolbar-icon"
                @action=${this._copyInfo}
              >
                <ha-icon-button
                  slot="trigger"
                  .label=${this.hass.localize("ui.panel.config.info.copy_menu")}
                  .path=${mdiContentCopy}
                ></ha-icon-button>
                <mwc-list-item>
                  ${this.hass.localize("ui.panel.config.info.copy_raw")}
                </mwc-list-item>
                <mwc-list-item>
                  ${this.hass.localize("ui.panel.config.info.copy_github")}
                </mwc-list-item>
              </ha-button-menu>
            `
          : ""}
        <div class="content">
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

          <ha-card outlined>
            <div class="card-content">${sections}</div>
          </ha-card>
          ${!this._coreStats && !this._supervisorStats
            ? ""
            : html`
                <ha-card outlined>
                  <div class="card-content">
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
                </ha-card>
              `}

          <integrations-card
            .hass=${this.hass}
            .narrow=${this.narrow}
          ></integrations-card>
        </div>
      </hass-subpage>
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

  private async _copyInfo(ev: CustomEvent<ActionDetail>): Promise<void> {
    const github = ev.detail.index === 1;
    let haContent: string | undefined;
    const domainParts: string[] = [];

    for (const domain of Object.keys(this._info!).sort(sortKeys)) {
      const domainInfo = this._info![domain];
      let first = true;
      const parts = [
        `${
          github && domain !== "homeassistant"
            ? `<details><summary>${domainToName(
                this.hass.localize,
                domain
              )}</summary>\n`
            : ""
        }`,
      ];

      for (const key of Object.keys(domainInfo.info)) {
        let value: unknown;

        if (typeof domainInfo.info[key] === "object") {
          const info = domainInfo.info[key] as SystemCheckValueObject;

          if (info.type === "pending") {
            value = "pending";
          } else if (info.type === "failed") {
            value = `failed to load: ${info.error}`;
          } else if (info.type === "date") {
            value = formatDateTime(new Date(info.value), this.hass.locale);
          }
        } else {
          value = domainInfo.info[key];
        }
        if (github && first) {
          parts.push(`${key} | ${value}\n-- | --`);
          first = false;
        } else {
          parts.push(`${key}${github ? " | " : ": "}${value}`);
        }
      }

      if (domain === "homeassistant") {
        haContent = parts.join("\n");
      } else {
        domainParts.push(parts.join("\n"));
        if (github && domain !== "homeassistant") {
          domainParts.push("</details>");
        }
      }
    }

    await copyToClipboard(
      `${github ? "## " : ""}System Health\n${haContent}\n\n${domainParts.join(
        "\n\n"
      )}`
    );

    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  static styles: CSSResultGroup = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
    integrations-card {
      max-width: 600px;
      display: block;
      max-width: 600px;
      margin: 0 auto;
      margin-bottom: 24px;
      margin-bottom: max(24px, env(safe-area-inset-bottom));
    }
    ha-card {
      display: block;
      max-width: 600px;
      margin: 0 auto;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    ha-alert {
      display: block;
      max-width: 500px;
      margin: 0 auto;
      margin-bottom: max(24px, env(safe-area-inset-bottom));
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

    a {
      color: var(--primary-color);
    }

    a.manage {
      text-decoration: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-system-health": HaConfigSystemHealth;
  }
}
