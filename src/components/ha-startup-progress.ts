import { mdiClose, mdiInformationOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import type { StartupProgressView } from "../data/bootstrap_integrations";
import { showStartupProgressDialog } from "../dialogs/startup-progress/show-dialog-startup-progress";
import "./ha-icon-button";
import "./progress/ha-progress-bar";

@customElement("ha-startup-progress")
export class HaStartupProgress extends LitElement {
  @property({ attribute: false }) public progress!: StartupProgressView;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render() {
    const localize = this._localize;
    const progress = this.progress;
    const issues = progress.failed.length + progress.retrying.length;
    const phase = localize(`ui.startup_progress.phase.${progress.phase}`);
    const count =
      progress.total === null
        ? localize("ui.startup_progress.integrations_unknown")
        : localize("ui.startup_progress.integrations", {
            done: progress.done,
            total: progress.total,
          });
    const issuesText = issues
      ? localize("ui.startup_progress.issues", { count: issues })
      : undefined;
    return html`
      <div class="card">
        <span class="visually-hidden" role="status">
          ${[phase, issuesText].filter(Boolean).join(". ")}
        </span>
        <div class="header">
          <div class="text">
            <span class="phase">${phase}</span>
            <span class="secondary">
              ${count}${issuesText ? ` · ${issuesText}` : nothing}
            </span>
          </div>
          <ha-icon-button
            .label=${localize("ui.startup_progress.details")}
            .path=${mdiInformationOutline}
            @click=${this._showDetails}
          ></ha-icon-button>
          <ha-icon-button
            .label=${localize("ui.notification_toast.dismiss")}
            .path=${mdiClose}
            @click=${this._dismiss}
          ></ha-icon-button>
        </div>
        <ha-progress-bar
          .value=${progress.percent ?? 0}
          .indeterminate=${progress.percent === undefined}
          .label=${phase}
        ></ha-progress-bar>
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
      flex-direction: column;
      gap: var(--ha-space-2);
      padding: var(--ha-space-3) var(--ha-space-4);
      color: var(--ha-color-on-neutral-loud);
      background-color: var(--ha-color-neutral-10);
      border-radius: var(--ha-border-radius-sm);
      box-shadow: var(--wa-shadow-l);
    }
    .header {
      display: flex;
      align-items: center;
    }
    .text {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    .phase {
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
    ha-progress-bar {
      --ha-progress-bar-track-height: 6px;
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
