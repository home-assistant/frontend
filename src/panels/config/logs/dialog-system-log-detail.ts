import "@home-assistant/webawesome/dist/components/skeleton/skeleton";
import { mdiContentCopy } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  GITHUB_CORE_ISSUES_URL,
  GITHUB_FRONTEND_ISSUES_URL,
} from "../../../common/url/github";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/ha-alert";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-dialog";
import type { IntegrationManifest } from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifest,
  integrationIssuesUrl,
} from "../../../data/integration";
import {
  getLoggedErrorIntegration,
  isCustomIntegrationError,
} from "../../../data/system_log";
import { systemLogReportUrl } from "../../../data/system_log_report";
import { subscribeSystemHealthInfo } from "../../../data/system_health";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import {
  DOCUMENTATION_URL,
  documentationUrl,
} from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import type { SystemLogDetailDialogParams } from "./show-dialog-system-log-detail";
import { formatSystemLogTime } from "./util";

/** Compares the host, so a URL that merely contains ours does not pass. */
const isOfficialDocumentationUrl = (url: string): boolean => {
  try {
    return new URL(url).hostname === "www.home-assistant.io";
  } catch (_err) {
    return false;
  }
};

@customElement("dialog-system-log-detail")
class DialogSystemLogDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: SystemLogDetailDialogParams;

  @state() private _manifest?: IntegrationManifest | null;

  @state() private _installationType?: string;

  @state() private _open = false;

  @query(".contents") private _contents?: HTMLElement;

  private _reportUrl = memoizeOne(systemLogReportUrl);

  private _fetchingInstallationType = false;

  public async showDialog(params: SystemLogDetailDialogParams): Promise<void> {
    this._params = params;
    this._manifest = undefined;
    this._open = true;
    await this.updateComplete;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!changedProps.has("_params") || !this._params) {
      return;
    }

    const integration = getLoggedErrorIntegration(this._params.item);

    if (integration) {
      this._fetchManifest(integration, this._params);
    }

    if (isComponentLoaded(this.hass.config, "system_health")) {
      this._fetchInstallationType();
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const item = this._params.item;

    const integration = getLoggedErrorIntegration(item);

    const reportUrl = this._reportUrl(
      item,
      this.hass.connection.haVersion,
      this._manifest,
      this._installationType
    );

    const reportTarget = reportUrl.startsWith(`${GITHUB_CORE_ISSUES_URL}/`)
      ? "core"
      : reportUrl.startsWith(`${GITHUB_FRONTEND_ISSUES_URL}/`)
        ? "frontend"
        : "custom";

    const reportMessage =
      this.isCustomIntegration && reportTarget === "core"
        ? "custom_fallback"
        : reportTarget;

    const showDocumentation =
      this._manifest &&
      (this._manifest.is_built_in ||
        // Custom components with our official docs should not link to our docs
        (!!this._manifest.documentation &&
          !isOfficialDocumentationUrl(this._manifest.documentation)));

    const documentationLink = this._manifest?.is_built_in
      ? documentationUrl(this.hass, `/integrations/${this._manifest.domain}`)
      : this._manifest?.documentation;

    const title = this.hass.localize("ui.panel.config.logs.details", {
      level: html`<span class=${item.level}
        >${this.hass.localize(`ui.panel.config.logs.level.${item.level}`)}</span
      >`,
    });

    return html`
      <ha-dialog
        .open=${this._open}
        width="large"
        @closed=${this._dialogClosed}
      >
        <span slot="headerTitle">${title}</span>
        <ha-icon-button
          id="copy"
          @click=${this._copyLog}
          slot="headerActionItems"
          .label=${this.hass.localize("ui.panel.config.logs.copy")}
          .path=${mdiContentCopy}
        ></ha-icon-button>
        ${
          integration &&
          this._manifest === undefined &&
          reportTarget !== "frontend"
            ? html`<ha-alert alert-type="info">
                <wa-skeleton effect="sheen"></wa-skeleton>
              </ha-alert>`
            : html`<ha-alert
                alert-type=${this.isCustomIntegration ? "warning" : "info"}
              >
                <p>
                  ${this.hass.localize(
                    `ui.panel.config.logs.detail.report_issue.${reportMessage}.introduction`,
                    {
                      integration:
                        this._manifest?.name ??
                        (integration
                          ? domainToName(this.hass.localize, integration)
                          : new URL(reportUrl).hostname),
                    }
                  )}
                </p>
                <p>
                  ${this.hass.localize(
                    `ui.panel.config.logs.detail.report_issue.${reportMessage}.report`,
                    {
                      report_link: html`<a
                        href=${reportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        >${this.hass.localize(`ui.panel.config.logs.detail.report_issue.${reportTarget}.link_text`)}</a
                      >`,
                    }
                  )}
                </p>
                ${
                  reportMessage !== "custom"
                    ? html`<p>
                        ${this.hass.localize(
                          `ui.panel.config.logs.detail.report_issue.${reportMessage}.guidance`,
                          {
                            guide_link: html`<a
                              href=${`${DOCUMENTATION_URL}/help/reporting_issues/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              >${this.hass.localize("ui.panel.config.logs.detail.report_issue.guide_link_text")}</a
                            >`,
                          }
                        )}
                      </p>`
                    : nothing
                }
              </ha-alert>`
        }
        <div class="contents" tabindex="-1" autofocus>
          <p>
            ${this.hass.localize("ui.panel.config.logs.detail.logger")}:
            ${item.name}<br />
            ${this.hass.localize("ui.panel.config.logs.detail.source")}:
            ${item.source.join(":")}
            ${
              integration
                ? html`
                    <br />
                    ${this.hass.localize(
                      "ui.panel.config.logs.detail.integration"
                    )}:
                    ${domainToName(this.hass.localize, integration)}
                    ${
                      !this._manifest ||
                      // Can happen with custom integrations
                      !showDocumentation ||
                      !documentationLink
                        ? ""
                        : html`
                            (<a
                              href=${documentationLink}
                              target="_blank"
                              rel="noreferrer"
                              >${this.hass.localize(
                                "ui.panel.config.logs.detail.documentation"
                              )}</a
                            >${
                              this._manifest.is_built_in ||
                              this._manifest.issue_tracker
                                ? html`,
                                    <a
                                      href=${integrationIssuesUrl(
                                        integration,
                                        this._manifest
                                      )}
                                      target="_blank"
                                      rel="noreferrer"
                                      >${this.hass.localize(
                                        "ui.panel.config.logs.detail.issues"
                                      )}</a
                                    >`
                                : ""
                            })
                          `
                    }
                  `
                : ""
            }
            <br />
            ${
              item.count > 0
                ? html`
                    ${this.hass.localize(
                      "ui.panel.config.logs.detail.first_occurred"
                    )}:
                    ${formatSystemLogTime(
                      item.first_occurred,
                      this.hass!.locale,
                      this.hass!.config
                    )}
                    (${this.hass.localize(
                      "ui.panel.config.logs.detail.number_of_occurrences",
                      {
                        count: item.count,
                      }
                    )}) <br />
                  `
                : ""
            }
            ${this.hass.localize("ui.panel.config.logs.detail.last_logged")}:
            ${formatSystemLogTime(
              item.timestamp,
              this.hass!.locale,
              this.hass!.config
            )}
          </p>
          ${
            item.message.length > 1
              ? html`
                  <ul>
                    ${item.message.map((msg) => html` <li>${msg}</li> `)}
                  </ul>
                `
              : item.message[0]
          }
          ${item.exception ? html` <pre>${item.exception}</pre> ` : nothing}
        </div>
      </ha-dialog>
    `;
  }

  private get isCustomIntegration(): boolean {
    return this._manifest
      ? !this._manifest.is_built_in
      : isCustomIntegrationError(this._params!.item);
  }

  private async _fetchManifest(
    integration: string,
    params: SystemLogDetailDialogParams
  ) {
    let manifest: IntegrationManifest | null;
    try {
      manifest = await fetchIntegrationManifest(this.hass, integration);
    } catch {
      // Ignore if loading manifest fails. Probably bad JSON in manifest.
      manifest = null;
    }

    if (this._params === params && this._open) {
      this._manifest = manifest;
    }
  }

  private _fetchInstallationType() {
    if (this._installationType || this._fetchingInstallationType) {
      return;
    }

    this._fetchingInstallationType = true;
    const subscription = subscribeSystemHealthInfo(this.hass, (info) => {
      this._fetchingInstallationType = false;
      if (!info) {
        return;
      }

      this._installationType = info.homeassistant?.info.installation_type;

      subscription.then((unsub) => unsub?.());
    }).catch(() => {
      // The report remains usable without system health information.
      this._fetchingInstallationType = false;
    });
  }

  private async _copyLog(): Promise<void> {
    const copyElement = this._contents!;

    let text = copyElement.innerText;

    if (this.isCustomIntegration) {
      text =
        this.hass.localize(
          "ui.panel.config.logs.error_from_custom_integration"
        ) +
        "\n\n" +
        text;
    }

    await copyToClipboard(text);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        a {
          color: var(--primary-color);
        }
        p {
          margin-top: 0;
        }
        pre {
          margin-bottom: 0;
          font-family: var(--ha-font-family-code);
        }
        ha-alert {
          display: block;
          margin-inline: calc(-1 * var(--ha-space-3));
          margin-block-end: var(--ha-space-4);
        }
        ha-alert p {
          margin: 0;
        }
        ha-alert p + p {
          margin-block-start: var(--ha-space-2);
        }
        wa-skeleton {
          height: 1em;
          --color: var(--ha-color-fill-neutral-normal-resting);
          --sheen-color: var(--ha-color-fill-neutral-loud-resting);
        }
        .contents {
          outline: none;
          direction: ltr;
        }
        .error {
          color: var(--error-color);
        }
        .warning {
          color: var(--warning-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-system-log-detail": DialogSystemLogDetail;
  }
}
