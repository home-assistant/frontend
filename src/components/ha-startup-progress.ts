import { mdiChevronDown, mdiChevronUp, mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import type { StartupProgressView } from "../data/bootstrap_integrations";
import { domainToName } from "../data/integration";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./progress/ha-progress-bar";

const MAX_ACTIVE = 8;

@customElement("ha-startup-progress")
export class HaStartupProgress extends LitElement {
  @property({ attribute: false }) public progress!: StartupProgressView;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state() private _expanded = false;

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
          <button
            class="toggle"
            aria-expanded=${this._expanded ? "true" : "false"}
            aria-controls="details"
            .title=${localize(
              this._expanded
                ? "ui.startup_progress.hide_details"
                : "ui.startup_progress.show_details"
            )}
            @click=${this._toggle}
          >
            <span class="text">
              <span class="phase">${phase}</span>
              <span class="secondary">
                ${count}${issuesText ? ` · ${issuesText}` : nothing}
              </span>
            </span>
            <ha-svg-icon
              aria-hidden="true"
              .path=${this._expanded ? mdiChevronUp : mdiChevronDown}
            ></ha-svg-icon>
          </button>
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
        ${this._expanded ? this._renderDetails() : nothing}
      </div>
    `;
  }

  private _renderDetails() {
    const localize = this._localize;
    const progress = this.progress;
    const active = progress.active.slice(0, MAX_ACTIVE);
    return html`
      <div class="details" id="details">
        ${
          progress.elapsed
            ? html`<div class="secondary">
                ${localize("ui.startup_progress.elapsed", {
                  seconds: Math.round(progress.elapsed),
                })}
              </div>`
            : nothing
        }
        ${
          active.length
            ? html`
                <div class="section">
                  ${localize("ui.startup_progress.active")}
                </div>
                <ul>
                  ${active.map(
                    ([domain, seconds]) => html`
                      <li>
                        <span>${domainToName(localize, domain)}</span>
                        <span class="secondary">
                          ${localize("ui.startup_progress.seconds", {
                            seconds: Math.round(seconds),
                          })}
                        </span>
                      </li>
                    `
                  )}
                </ul>
                ${
                  progress.active.length > MAX_ACTIVE
                    ? html`<div class="secondary">
                        ${localize("ui.startup_progress.more", {
                          count: progress.active.length - MAX_ACTIVE,
                        })}
                      </div>`
                    : nothing
                }
              `
            : nothing
        }
        ${this._renderDomains("failed", progress.failed)}
        ${this._renderDomains("retrying", progress.retrying)}
      </div>
    `;
  }

  private _renderDomains(key: "failed" | "retrying", domains: string[]) {
    if (!domains.length) {
      return nothing;
    }
    const localize = this._localize;
    return html`
      <div class="section">${localize(`ui.startup_progress.${key}`)}</div>
      <div class="secondary">
        ${domains.map((domain) => domainToName(localize, domain)).join(", ")}
      </div>
    `;
  }

  private _toggle() {
    this._expanded = !this._expanded;
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
      z-index: 8;
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
      gap: var(--ha-space-1);
    }
    .toggle {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      flex: 1;
      min-width: 0;
      padding: var(--ha-space-1);
      margin: calc(var(--ha-space-1) * -1);
      border: none;
      border-radius: var(--ha-border-radius-sm);
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .toggle:focus-visible {
      outline: 2px solid var(--ha-color-focus);
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
    .phase,
    .section {
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
    .details {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-1);
      max-height: 40vh;
      overflow-y: auto;
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      justify-content: space-between;
      gap: var(--ha-space-2);
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
