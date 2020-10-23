import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../hassio/src/components/hassio-ansi-to-html";
import { showHassioSnapshotDialog } from "../../hassio/src/dialogs/snapshot/show-dialog-hassio-snapshot";
import { showSnapshotUploadDialog } from "../../hassio/src/dialogs/snapshot/show-dialog-snapshot-upload";
import { navigate } from "../common/navigate";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-card";
import {
  extractApiErrorMessage,
  ignoredStatusCodes,
} from "../data/hassio/common";
import { makeDialogManager } from "../dialogs/make-dialog-manager";
import { ProvideHassLitMixin } from "../mixins/provide-hass-lit-mixin";
import { haStyle } from "../resources/styles";
import "./onboarding-loading";

declare global {
  interface HASSDomEvents {
    restoring: undefined;
  }
}

@customElement("onboarding-restore-snapshot")
class OnboardingRestoreSnapshot extends ProvideHassLitMixin(LitElement) {
  @property() public localize!: LocalizeFunc;

  @property() public language!: string;

  @property({ type: Boolean }) public restoring = false;

  @internalProperty() private _log = "";

  @internalProperty() private _showFullLog = false;

  protected render(): TemplateResult {
    return this.restoring
      ? html`<ha-card
          .header=${this.localize(
            "ui.panel.page-onboarding.restore.in_progress"
          )}
        >
          ${this._showFullLog
            ? html`<hassio-ansi-to-html .content=${this._log}>
              </hassio-ansi-to-html>`
            : html`<onboarding-loading></onboarding-loading>
                <hassio-ansi-to-html
                  class="logentry"
                  .content=${this._lastLogEntry(this._log)}
                >
                </hassio-ansi-to-html>`}
          <div class="card-actions">
            <mwc-button @click=${this._toggeFullLog}>
              ${this._showFullLog
                ? this.localize("ui.panel.page-onboarding.restore.hide_log")
                : this.localize("ui.panel.page-onboarding.restore.show_log")}
            </mwc-button>
          </div>
        </ha-card>`
      : html`
          <button class="link" @click=${this._uploadSnapshot}>
            ${this.localize("ui.panel.page-onboarding.restore.description")}
          </button>
        `;
  }

  private _toggeFullLog(): void {
    this._showFullLog = !this._showFullLog;
  }

  private _filterLogs(logs: string): string {
    // Filter out logs that is not relevant to show during the restore
    return logs
      .split("\n")
      .filter(
        (entry) =>
          !entry.includes("/supervisor/logs") &&
          !entry.includes("/supervisor/ping") &&
          !entry.includes("DEBUG") &&
          !entry.includes("TypeError: Failed to fetch")
      )
      .join("\n")
      .replace(/\s[A-Z]+\s\(\w+\)\s\[[\w.]+\]/gi, "")
      .replace(/\d{2}-\d{2}-\d{2}\s/gi, "");
  }

  private _lastLogEntry(logs: string): string {
    return logs
      .split("\n")
      .slice(-2)[0]
      .replace(/\d{2}:\d{2}:\d{2}\s/gi, "");
  }

  private _uploadSnapshot(): void {
    showSnapshotUploadDialog(this, {
      showSnapshot: (slug: string) => this._showSnapshotDialog(slug),
      onboarding: true,
    });
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    makeDialogManager(this, this.shadowRoot!);
    setInterval(() => this._getLogs(), 1000);
  }

  private async _getLogs(): Promise<void> {
    if (this.restoring) {
      try {
        const response = await fetch("/api/hassio/supervisor/logs", {
          method: "GET",
        });
        if (response.status === 401) {
          // If we get a unauthorized response, the restore is done
          this._restoreDone();
        } else if (
          response.status &&
          !ignoredStatusCodes.has(response.status)
        ) {
          // Handle error responses
          this._log += this._filterLogs(extractApiErrorMessage(response));
        }
        const logs = await response.text();
        this._log = this._filterLogs(logs);
        if (this._log.match(/\d{2}:\d{2}:\d{2}\s.*Restore\s\w+\sdone/)) {
          // The log indicates that the restore done, navigate the user back to base
          this._restoreDone();
        }
      } catch (err) {
        this._log += this._filterLogs(err.toString());
      }
    }
  }

  private _restoreDone(): void {
    navigate(this, "/", true);
    location.reload();
  }

  private _showSnapshotDialog(slug: string): void {
    showHassioSnapshotDialog(this, {
      slug,
      onboarding: true,
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .logentry {
          text-align: center;
        }
        ha-card {
          padding: 4px;
          margin-top: 8px;
        }
        hassio-ansi-to-html {
          display: block;
          line-height: 22px;
          padding: 0 8px;
          white-space: pre-wrap;
        }

        @media all and (min-width: 600px) {
          ha-card {
            width: 600px;
            margin-left: -100px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-snapshot": OnboardingRestoreSnapshot;
  }
}
