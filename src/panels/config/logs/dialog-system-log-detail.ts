import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/dialog/ha-paper-dialog";
import {
  domainToName,
  fetchIntegrationManifest,
  integrationIssuesUrl,
  IntegrationManifest,
} from "../../../data/integration";
import { getLoggedErrorIntegration } from "../../../data/system_log";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { SystemLogDetailDialogParams } from "./show-dialog-system-log-detail";
import { formatSystemLogTime } from "./util";

class DialogSystemLogDetail extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() private _params?: SystemLogDetailDialogParams;

  @property() private _manifest?: IntegrationManifest;

  public async showDialog(params: SystemLogDetailDialogParams): Promise<void> {
    this._params = params;
    this._manifest = undefined;
    await this.updateComplete;
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
        <h2>
          ${this.hass.localize(
            "ui.panel.config.logs.details",
            "level",
            item.level
          )}
        </h2>
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
      this._params = undefined;
    }
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
