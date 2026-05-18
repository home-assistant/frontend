import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-tooltip";

export type LiveTestState = "pass" | "fail" | "invalid" | "unknown";

/**
 * @element ha-automation-row-live-test
 *
 * @summary
 * Small status indicator dot used in automation/condition rows to surface the
 * live evaluation result. Renders an optional tooltip with details on hover.
 *
 * @attr {"pass"|"fail"|"invalid"|"unknown"} state - The current live-test state. Defaults to `unknown`.
 * @attr {string} label - Accessible label announced by assistive technology.
 * @attr {string} message - Optional tooltip body shown on hover/focus.
 */
@customElement("ha-automation-row-live-test")
export class HaAutomationRowLiveTest extends LitElement {
  @property({ reflect: true }) public state: LiveTestState = "unknown";

  @property() public label = "";

  @property() public message?: string;

  protected render() {
    return html`
      <div
        id="indicator"
        role="status"
        tabindex="0"
        aria-label=${this.label}
      ></div>
      ${this.message
        ? html`<ha-tooltip for="indicator">${this.message}</ha-tooltip>`
        : nothing}
    `;
  }

  static styles = css`
    :host {
      position: absolute;
      inset-inline-end: -6px;
      display: inline-block;
    }
    #indicator {
      width: 12px;
      height: 12px;
      border-radius: var(--ha-border-radius-circle);
      border: 3px solid;
      box-sizing: border-box;
      background-color: var(--card-background-color);
      transition: all var(--ha-animation-duration-normal) ease-in-out;
    }
    :host([state="pass"]) #indicator {
      background-color: var(--ha-color-fill-success-loud-resting);
      border-color: var(--ha-color-fill-success-loud-resting);
    }
    :host([state="pass"]) #indicator:hover {
      background-color: var(--ha-color-fill-success-loud-hover);
      border-color: var(--ha-color-fill-success-loud-hover);
    }
    :host([state="fail"]) #indicator {
      border-color: var(--ha-color-fill-warning-loud-resting);
    }
    :host([state="fail"]) #indicator:hover {
      background-color: var(--ha-color-fill-warning-loud-hover);
      border-color: var(--ha-color-fill-warning-loud-hover);
    }
    :host([state="invalid"]) #indicator {
      border-color: var(--ha-color-fill-danger-loud-resting);
    }
    :host([state="invalid"]) #indicator:hover {
      background-color: var(--ha-color-fill-danger-loud-hover);
      border-color: var(--ha-color-fill-danger-loud-hover);
    }
    :host([state="unknown"]) #indicator {
      border-color: var(--ha-color-fill-neutral-loud-resting);
    }
    :host([state="unknown"]) #indicator:hover {
      background-color: var(--ha-color-fill-neutral-loud-hover);
      border-color: var(--ha-color-fill-neutral-loud-hover);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row-live-test": HaAutomationRowLiveTest;
  }
}
