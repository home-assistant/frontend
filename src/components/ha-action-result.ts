import { mdiAlertOctagram, mdiCheckBold } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "./ha-spinner";
import "./ha-svg-icon";

type ActionResult = "success" | "error";

// Keep in sync with ha-progress-button
const RESULT_DURATION = 2000;

// Long enough that fast actions go straight to their result without a flash
const SPINNER_DELAY = 150;

/**
 * Home Assistant action result component
 *
 * @element ha-action-result
 *
 * @summary
 * Wraps the content of an action trigger, for example an `ha-control-button`,
 * and swaps it for a spinner while a slow action runs and for a success or
 * error icon once it settles.
 *
 * @slot - Content of the trigger.
 *
 * @cssprop --ha-action-result-fill-success - Background behind the success icon. Defaults to `transparent`.
 * @cssprop --ha-action-result-fill-error - Background behind the error icon. Defaults to `transparent`.
 */
@customElement("ha-action-result")
export class HaActionResult extends LitElement {
  @state() private _loading = false;

  @state() private _showSpinner = false;

  @state() private _result?: ActionResult;

  private _timeout?: number;

  private _spinnerTimeout?: number;

  public get busy(): boolean {
    return this._loading;
  }

  public async run(action: Promise<unknown>): Promise<void> {
    clearTimeout(this._timeout);
    clearTimeout(this._spinnerTimeout);
    this._result = undefined;
    this._loading = true;
    this._spinnerTimeout = window.setTimeout(() => {
      this._showSpinner = true;
    }, SPINNER_DELAY);
    try {
      await action;
      this._result = "success";
    } catch (_err) {
      this._result = "error";
    } finally {
      clearTimeout(this._spinnerTimeout);
      this._loading = false;
      this._showSpinner = false;
      this._timeout = window.setTimeout(() => {
        this._result = undefined;
      }, RESULT_DURATION);
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._timeout);
    clearTimeout(this._spinnerTimeout);
    this._showSpinner = false;
    this._result = undefined;
  }

  protected render() {
    const busy = this._showSpinner || this._result !== undefined;

    return html`
      <span class="content ${busy ? "hidden" : ""}"><slot></slot></span>
      ${
        busy
          ? html`<div class="indicator ${this._result ?? ""}">
              ${this._renderIndicator()}
            </div>`
          : nothing
      }
    `;
  }

  private _renderIndicator() {
    if (!this._result) {
      return html`<ha-spinner></ha-spinner>`;
    }
    return html`
      <ha-svg-icon
        class=${this._result}
        .path=${this._result === "success" ? mdiCheckBold : mdiAlertOctagram}
      ></ha-svg-icon>
    `;
  }

  static styles = css`
    /* Prefer no box so the host inherits the layout of the slot it sits in.
       A ::slotted() rule in the host component can still override this. */
    :host {
      display: contents;
    }
    .content {
      transition: opacity var(--ha-animation-duration-instant) ease-in-out;
    }
    .content.hidden {
      opacity: 0;
    }
    .indicator {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fade-in var(--ha-animation-duration-instant) ease-in-out;
    }
    /* Only the result covers the trigger, the spinner lets it show through */
    .indicator.success {
      background-color: var(--ha-action-result-fill-success, transparent);
    }
    .indicator.error {
      background-color: var(--ha-action-result-fill-error, transparent);
    }
    ha-spinner {
      --ha-spinner-size: var(--mdc-icon-size, 24px);
      --track-width: 2px;
    }
    /* Overshoot so the icon lands with a small pop */
    ha-svg-icon {
      animation: scale var(--ha-animation-duration-fast)
        cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    ha-svg-icon.success {
      color: var(--ha-color-on-success-quiet);
    }
    ha-svg-icon.error {
      color: var(--ha-color-on-danger-quiet);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-action-result": HaActionResult;
  }
}
