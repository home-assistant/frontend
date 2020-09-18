import "@material/mwc-icon-button/mwc-icon-button";
import { mdiContentCopy } from "@mdi/js";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-tooltip/paper-tooltip";
import type { PaperTooltipElement } from "@polymer/paper-tooltip/paper-tooltip";
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
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/dialog/ha-paper-dialog";
import "../../../components/ha-svg-icon";
import {
  domainToName,
  fetchIntegrationManifest,
  integrationIssuesUrl,
  IntegrationManifest,
} from "../../../data/integration";
import { getLoggedErrorIntegration } from "../../../data/system_log";
import type { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { SystemLogDetailDialogParams } from "./show-dialog-system-log-detail";
import { formatSystemLogTime } from "./util";

class DialogSystemLogDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _params?: SystemLogDetailDialogParams;

  @internalProperty() private _manifest?: IntegrationManifest;

  @query("paper-tooltip") private _toolTip?: PaperTooltipElement;

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
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <div class="heading">
          <h2>
            ${this.hass.localize(
              "ui.panel.config.logs.details",
              "level",
              item.level
            )}
          </h2>
          <mwc-icon-button id="copy" @click=${this._copyLog}>
            <ha-svg-icon .path=${mdiContentCopy}></ha-svg-icon>
          </mwc-icon-button>
          <paper-tooltip
            manual-mode
            for="copy"
            position="left"
            animation-delay="0"
            offset="4"
            >${this.hass.localize("ui.common.copied")}</paper-tooltip
          >
        </div>
        <paper-dialog-scrollable>
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
        </paper-dialog-scrollable>
      </ha-paper-dialog>
    `;
  }

  private async _fetchManifest(integration: string) {
    try {
      this._manifest = await fetchIntegrationManifest(this.hass, integration);
    } catch (err) {
      // Ignore if loading manifest fails. Probably bad JSON in manifest
    }
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this.closeDialog();
    }
  }

  private _copyLog(): void {
    const copyElement = this.shadowRoot?.querySelector(
      "paper-dialog-scrollable"
    ) as HTMLElement;

    const selection = window.getSelection()!;
    const range = document.createRange();

    range.selectNodeContents(copyElement);
    selection.removeAllRanges();
    selection.addRange(range);

    document.execCommand("copy");
    window.getSelection()!.removeAllRanges();

    this._toolTip!.show();
    setTimeout(() => this._toolTip?.hide(), 3000);
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          direction: ltr;
        }
        a {
          color: var(--primary-color);
        }
        p {
          margin-top: 0;
        }
        pre {
          margin-bottom: 0;
        }
        .heading {
          display: flex;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .heading ha-svg-icon {
          cursor: pointer;
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
