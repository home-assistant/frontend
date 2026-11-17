import { mdiClose, mdiInformationOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import { showStartupProgressDialog } from "../dialogs/startup-progress/show-dialog-startup-progress";
import "./ha-icon-button";

@customElement("ha-startup-progress")
export class HaStartupProgress extends LitElement {
  // The launch screen render swap would remove a dialog opened before it.
  @property({ attribute: false }) public detailsAvailable = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  // Fallbacks cover the first render, before the core translations have loaded.
  protected render() {
    const localize = this._localize;
    return html`
      <div class="card">
        <div class="text" role="status">
          <span class="title">
            ${
              localize("ui.startup_progress.starting") ||
              "Home Assistant is starting"
            }
          </span>
          <span class="secondary">
            ${
              localize("ui.startup_progress.starting_secondary") ||
              "Some features may not be available yet"
            }
          </span>
        </div>
        ${
          this.detailsAvailable
            ? html`<ha-icon-button
                .label=${
                  localize("ui.startup_progress.details") || "Startup details"
                }
                .path=${mdiInformationOutline}
                @click=${this._showDetails}
              ></ha-icon-button>`
            : nothing
        }
        <ha-icon-button
          .label=${localize("ui.notification_toast.dismiss") || "Dismiss"}
          .path=${mdiClose}
          @click=${this._dismiss}
        ></ha-icon-button>
      </div>
    `;
  }

  private _showDetails() {
    showStartupProgressDialog(this);
  }

  private _dismiss() {
    fireEvent(this, "startup-progress-dismissed");
  }

  static styles = css`
    :host {
      position: fixed;
      inset-inline-start: 50%;
      inset-block-end: calc(
        var(--safe-area-inset-bottom, 0px) + var(--ha-space-4)
      );
      transform: translateX(calc(-50% * var(--scale-direction, 1)));
      /* Above the launch screen, which can still be fading out. */
      z-index: 101;
      width: min(420px, calc(100vw - var(--ha-space-8)));
    }
    .card {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      padding: var(--ha-space-3) var(--ha-space-2) var(--ha-space-3)
        var(--ha-space-4);
      color: var(--ha-color-on-neutral-loud);
      background-color: var(--ha-color-neutral-10);
      border-radius: var(--ha-border-radius-sm);
      box-shadow: var(--wa-shadow-l);
    }
    .text {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .title {
      font-weight: var(--ha-font-weight-medium);
    }
    .secondary {
      /* The card is dark in both themes, so the themed quiet color lacks contrast. */
      color: var(--ha-color-neutral-70);
      font-size: var(--ha-font-size-s);
    }
    ha-icon-button {
      --mdc-icon-button-size: 36px;
      color: var(--ha-color-on-neutral-loud);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-startup-progress": HaStartupProgress;
  }
  interface HASSDomEvents {
    "startup-progress-dismissed": undefined;
  }
}
