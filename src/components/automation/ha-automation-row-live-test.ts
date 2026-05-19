import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";

export type LiveTestState = "pass" | "fail" | "invalid" | "unknown";

/**
 * @element ha-automation-row-live-test
 *
 * @summary
 * Small status indicator dot used in automation/condition rows to surface the
 * live evaluation result.
 *
 * @attr {"pass"|"fail"|"invalid"|"unknown"} state - The current live-test state. Defaults to `unknown`.
 * @attr {string} label - Accessible label announced by assistive technology.
 */
@customElement("ha-automation-row-live-test")
export class HaAutomationRowLiveTest extends LitElement {
  @property({ reflect: true }) public state: LiveTestState = "unknown";

  @property() public label = "";

  protected render() {
    return html`
      <div
        id="indicator"
        role="status"
        tabindex="0"
        aria-label=${this.label}
      ></div>
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
    :host([state="fail"]) #indicator {
      border-color: var(--ha-color-fill-warning-loud-resting);
    }
    :host([state="invalid"]) #indicator {
      border-color: var(--ha-color-fill-danger-loud-resting);
    }
    :host([state="unknown"]) #indicator {
      border-color: var(--ha-color-fill-neutral-loud-resting);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row-live-test": HaAutomationRowLiveTest;
  }
}
