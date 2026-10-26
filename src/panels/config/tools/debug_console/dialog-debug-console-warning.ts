import type { ContextType } from "@lit/context";
import { mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import type { HASSDomTargetEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../components/ha-checkbox";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-icon-button";
import {
  apiContext,
  internationalizationContext,
} from "../../../../data/context";
import { acceptDebugConsoleWarning } from "../../../../data/debug_console";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import type {
  DebugConsoleWarningDialogParams,
  DebugConsoleWarningResult,
} from "./show-dialog-debug-console-warning";

const RISKS = ["scams", "access", "safety", "logged"] as const;

// Long enough to read the risks before they can be accepted.
const READ_SECONDS = 10;

/**
 * Asks a user to accept the risks before using the debug console, on versions
 * of Home Assistant that are not for development.
 */
@customElement("dialog-debug-console-warning")
export class DialogDebugConsoleWarning extends DialogMixin<DebugConsoleWarningDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _understood = false;

  @state() private _accepting = false;

  @state() private _error?: string;

  @state() private _secondsLeft = READ_SECONDS;

  private _result: DebugConsoleWarningResult = "closed";

  private _countdown?: number;

  public connectedCallback(): void {
    super.connectedCallback();

    const shownAt = Date.now();
    this._secondsLeft = READ_SECONDS;
    this._countdown = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - shownAt) / 1000);
      this._secondsLeft = Math.max(READ_SECONDS - elapsed, 0);
      if (this._secondsLeft === 0) {
        this._stopCountdown();
      }
    }, 1000);
  }

  public disconnectedCallback(): void {
    this._stopCountdown();
    this.params?.closedCallback(this._result);
    super.disconnectedCallback();
  }

  protected render() {
    if (!this.params || !this._i18n) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        prevent-scrim-close
        width="medium"
        @keydown=${this._escapeListener}
        .headerTitle=${this._i18n.localize(
          "ui.panel.config.tools.tabs.debug_console.warning.title"
        )}
      >
        <ha-icon-button
          slot="headerNavigationIcon"
          .label=${this._i18n.localize("ui.common.close")}
          .path=${mdiClose}
          @click=${this._decline}
        ></ha-icon-button>
        <p>
          ${this._i18n.localize(
            "ui.panel.config.tools.tabs.debug_console.warning.intro"
          )}
        </p>
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        <ha-alert alert-type="warning">
          <ul>
            ${RISKS.map(
              (risk) =>
                html`<li>
                  ${this._i18n.localize(
                    `ui.panel.config.tools.tabs.debug_console.warning.risks.${risk}`
                  )}
                </li>`
            )}
          </ul>
        </ha-alert>
        <ha-checkbox
          autofocus
          variant="warning"
          .checked=${this._understood}
          .disabled=${this._accepting}
          @change=${this._understoodChanged}
        >
          ${this._i18n.localize(
            "ui.panel.config.tools.tabs.debug_console.warning.understand"
          )}
        </ha-checkbox>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._decline}
          >
            ${this._i18n.localize(
              "ui.panel.config.tools.tabs.debug_console.warning.go_back"
            )}
          </ha-button>
          <ha-button
            slot="primaryAction"
            variant="warning"
            .disabled=${!this._understood || this._secondsLeft > 0}
            .loading=${this._accepting}
            @click=${this._accept}
          >
            ${
              this._secondsLeft > 0
                ? this._i18n.localize(
                    "ui.panel.config.tools.tabs.debug_console.warning.continue_in",
                    { seconds: this._secondsLeft }
                  )
                : this._i18n.localize(
                    "ui.panel.config.tools.tabs.debug_console.warning.continue"
                  )
            }
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _stopCountdown(): void {
    window.clearInterval(this._countdown);
    this._countdown = undefined;
  }

  private _understoodChanged(ev: HASSDomTargetEvent<HaCheckbox>): void {
    this._understood = ev.target.checked;
  }

  private async _accept(): Promise<void> {
    if (!this._understood || this._secondsLeft > 0 || this._accepting) {
      return;
    }

    this._accepting = true;
    this._error = undefined;
    try {
      await acceptDebugConsoleWarning(this._api);
    } catch (err: unknown) {
      this._error = (err as { message?: string }).message ?? String(err);
      return;
    } finally {
      this._accepting = false;
    }

    this._result = "accepted";
    this.closeDialog();
  }

  private _decline() {
    this._result = "declined";
    this.closeDialog();
  }

  // Escape closes the dialog too, which declines it like the buttons do. In
  // the capture phase, as the dialog itself stops it from going further.
  private _escapeListener = {
    handleEvent: (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        this._result = "declined";
      }
    },
    capture: true,
  };

  static styles = css`
    p {
      margin-top: 0;
    }

    ha-alert {
      display: block;
      margin-bottom: var(--ha-space-4);
    }

    ul {
      margin: 0;
      padding-inline-start: var(--ha-space-5);
    }

    li + li {
      margin-top: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-debug-console-warning": DialogDebugConsoleWarning;
  }
}
