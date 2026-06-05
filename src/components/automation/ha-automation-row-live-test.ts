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
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      margin-inline-start: var(--ha-space-1);
    }
    #indicator {
      width: 10px;
      height: 10px;
      border-radius: var(--ha-border-radius-circle);
      border: var(--ha-border-width-md) solid;
      box-sizing: border-box;
      background-color: var(--card-background-color);
      box-shadow: 0 0 0 2px var(--card-background-color);
      transition: all var(--ha-animation-duration-normal) ease-in-out;
    }
    :host([state="pass"]) #indicator {
      background-color: var(--ha-color-green-60);
      border-color: var(--ha-color-green-60);
    }
    :host([state="fail"]) #indicator {
      border-color: var(--ha-color-orange-60);
    }
    :host([state="invalid"]) #indicator {
      border-color: var(--ha-color-red-60);
    }
    :host([state="unknown"]) #indicator {
      border-color: var(--ha-color-neutral-60);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row-live-test": HaAutomationRowLiveTest;
  }
}
