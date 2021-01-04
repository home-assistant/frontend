import "../../../components/ha-header-bar";
import "@material/mwc-icon-button/mwc-icon-button";
import { mdiContentCopy, mdiClose } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../common/dom/fire_event";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/ha-dialog";
import "../../../components/ha-svg-icon";
import {
  domainToName,
  fetchIntegrationManifest,
  integrationIssuesUrl,
  IntegrationManifest,
} from "../../../data/integration";
import { getLoggedErrorIntegration } from "../../../data/system_log";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { SystemLogDetailDialogParams } from "./show-dialog-system-log-detail";
import { formatSystemLogTime } from "./util";
import { showToast } from "../../../util/toast";

class DialogSystemLogDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _params?: SystemLogDetailDialogParams;

  @internalProperty() private _manifest?: IntegrationManifest;

  public async showDialog(params: SystemLogDetailDialogParams): Promise<void> {
    this._params = params;
    this._manifest = undefined;
    await this.updateComplete;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (!changedProps.has("_params") || !this._params) {
      return;
    }
    const integration = getLoggedErrorIntegration(this._params.item);
    if (integration) {
      this._fetchManifest(integration);
    }
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const item = this._params.item;

    const integration = getLoggedErrorIntegration(item);

    return html`
      <ha-dialog open @closed=${this.closeDialog} hideActions heading=${true}>
        <ha-header-bar slot="heading">
          <mwc-icon-button slot="navigationIcon" dialogAction="cancel">
            <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
          </mwc-icon-button>
          <span slot="title">
            ${this.hass.localize(
              "ui.panel.config.logs.details",
              "level",
              item.level
            )}
          </span>
          <mwc-icon-button id="copy" @click=${this._copyLog} slot="actionItems">
            <ha-svg-icon .path=${mdiContentCopy}></ha-svg-icon>
          </mwc-icon-button>
        </ha-header-bar>
        <div class="contents">
          <p>
            Logger: ${item.name}<br />
            Source: ${item.source.join(":")}
            ${integration
              ? html`
                  <br />
                  Integration: ${domainToName(this.hass.localize, integration)}
                  ${!this._manifest ||
                  // Can happen with custom integrations
                  !this._manifest.documentation
                    ? ""
                    : html`
                        (<a
                          href=${this._manifest.documentation}
                          target="_blank"
                          rel="noreferrer"
                          >documentation</a
                        >${this._manifest.is_built_in ||
                        this._manifest.issue_tracker
                          ? html`,
                              <a
                                href=${integrationIssuesUrl(
                                  integration,
                                  this._manifest
                                )}
                                target="_blank"
                                rel="noreferrer"
                                >issues</a
                              >`
                          : ""})
                      `}
                `
              : ""}
            <br />
            ${item.count > 0
              ? html`
                  First occurred:
                  ${formatSystemLogTime(
                    item.first_occurred,
                    this.hass!.language
                  )}
                  (${item.count} occurrences) <br />
                `
              : ""}
            Last logged:
            ${formatSystemLogTime(item.timestamp, this.hass!.language)}
          </p>
          ${item.message.length > 1
            ? html`
                <ul>
                  ${item.message.map((msg) => html` <li>${msg}</li> `)}
                </ul>
              `
            : item.message[0]}
          ${item.exception ? html` <pre>${item.exception}</pre> ` : html``}
        </div>
      </ha-dialog>
    `;
  }

  private async _fetchManifest(integration: string) {
    try {
      this._manifest = await fetchIntegrationManifest(this.hass, integration);
    } catch (err) {
      // Ignore if loading manifest fails. Probably bad JSON in manifest
    }
  }

  private async _copyLog(): Promise<void> {
    const copyElement = this.shadowRoot?.querySelector(
      ".contents"
    ) as HTMLElement;

    await copyToClipboard(copyElement.innerText);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  static get styles(): CSSResult[] {
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
          font-family: var(--code-font-family, monospace);
        }

        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
        }

        @media all and (min-width: 451px) and (min-height: 501px) {
          ha-dialog {
            --mdc-dialog-max-width: 90vw;
          }
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

customElements.define("dialog-system-log-detail", DialogSystemLogDetail);
