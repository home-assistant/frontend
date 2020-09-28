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
import { makeDialogManager } from "../dialogs/make-dialog-manager";
import { ProvideHassLitMixin } from "../mixins/provide-hass-lit-mixin";
import { haStyle } from "../resources/styles";

declare global {
  interface HASSDomEvents {
    restoring: undefined;
  }
}

@customElement("onboarding-restore-snapshot")
class OnboardingRestoreSnapshot extends ProvideHassLitMixin(LitElement) {
  @property() public localize!: LocalizeFunc;

  @property() public language!: string;

  @property({ type: Boolean }) private restoring = false;

  @internalProperty() private _log?: string;

  protected render(): TemplateResult {
    return this.restoring
      ? html`<ha-card>
          <h2>
            ${this.localize("ui.panel.page-onboarding.restore.in_progress")}
          </h2>
          ${this._log
            ? html`<hassio-ansi-to-html
                class="log"
                .content=${this._filterLogs(this._log)}
              ></hassio-ansi-to-html>`
            : ""}
        </ha-card>`
      : html`
          <button class="link" @click=${this._uploadSnapshot}>
            ${this.localize("ui.panel.page-onboarding.restore.description")}
          </button>
        `;
  }

  private _filterLogs(logs: string): string {
    // Filter out logs that is not relevant to show during the restore
    return logs
      .split("\n")
      .filter(
        (entry) =>
          !entry.includes("/supervisor/logs") &&
          !entry.includes("/supervisor/ping") &&
          !entry.includes("DEBUG")
      )
      .slice(-16, -1) // We only show the last 15 lines, anything beyond that is not a part of the restore
      .join("\n")
      .replace(/\s[A-Z]+\s\(\w+\)\s\[[\w.]+\]/gi, "")
      .replace(/\d{2}-\d{2}-\d{2}\s/gi, "");
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
        const logs = await response.text();
        this._log = this._filterLogs(logs);
        if (this._log.match(/\d{2}:\d{2}:\d{2}\s.*Restore\s\w+\sdone/)) {
          // The log indicates that the restore done, navigate the user back to base
          navigate(this, "/", true);
          location.reload();
        }
      } catch (err) {
        this._log = err.toString();
      }
    }
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
        .log {
          white-space: pre-wrap;
          line-height: 22px;
        }
        ha-card {
          padding: 4px;
          margin-top: 8px;
        }
        hassio-ansi-to-html {
          display: block;
          padding: 0 8px;
        }
        h2:after {
          display: inline-block;
          animation: dots steps(1, end) 2s infinite;
          content: "";
        }

        @keyframes dots {
          0% {
            content: "";
          }
          25% {
            content: ".";
          }
          50% {
            content: "..";
          }
          75% {
            content: "...";
          }
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
