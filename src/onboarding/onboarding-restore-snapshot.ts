import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
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

  protected render(): TemplateResult {
    return this.restoring
      ? html`<ha-card
          .header=${this.localize(
            "ui.panel.page-onboarding.restore.in_progress"
          )}
        >
          <onboarding-loading></onboarding-loading>
        </ha-card>`
      : html`
          <button class="link" @click=${this._uploadSnapshot}>
            ${this.localize("ui.panel.page-onboarding.restore.description")}
          </button>
        `;
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
    setInterval(() => this._checkRestoreStatus(), 1000);
  }

  private async _checkRestoreStatus(): Promise<void> {
    if (this.restoring) {
      try {
        const response = await fetch("/api/hassio/supervisor/info", {
          method: "GET",
        });
        if (response.status === 401) {
          // If we get a unauthorized response, the restore is done
          navigate(this, "/", true);
          location.reload();
        }
      } catch (err) {
        // We fully expected issues with fetching info untill restore is complete.
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
