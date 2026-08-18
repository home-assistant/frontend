import { mdiAlertOctagram, mdiCheckBold } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "./ha-svg-icon";

type ActionResult = "success" | "error";

// Keep in sync with ha-progress-button
const RESULT_DURATION = 2000;

/**
 * Home Assistant action result component
 *
 * @element ha-action-result
 *
 * @summary
 * Briefly covers its closest positioned ancestor with a success or error
 * indicator, for example when placed inside an `ha-control-button`.
 */
@customElement("ha-action-result")
export class HaActionResult extends LitElement {
  @state() private _result?: ActionResult;

  private _timeout?: number;

  public success(): void {
    this._setResult("success");
  }

  public error(): void {
    this._setResult("error");
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._timeout);
    this._result = undefined;
  }

  private _setResult(result: ActionResult) {
    clearTimeout(this._timeout);
    this._result = result;
    this._timeout = window.setTimeout(() => {
      this._result = undefined;
    }, RESULT_DURATION);
  }

  protected render() {
    if (!this._result) {
      return nothing;
    }

    return html`
      <div class="result ${this._result}">
        <ha-svg-icon
          .path=${this._result === "success" ? mdiCheckBold : mdiAlertOctagram}
        ></ha-svg-icon>
      </div>
    `;
  }

  static styles = css`
    /* No box, so the host escapes the styling of the slot it sits in */
    :host {
      display: contents;
    }
    .result {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      animation: fade-in var(--ha-animation-duration-instant) ease-in-out;
    }
    .result.success {
      background-color: var(--ha-color-fill-success-loud-resting);
      color: var(--ha-color-on-success-loud);
    }
    .result.error {
      background-color: var(--ha-color-fill-danger-loud-resting);
      color: var(--ha-color-on-danger-loud);
    }
    .result ha-svg-icon {
      animation: scale var(--ha-animation-duration-fast) ease-in-out;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-action-result": HaActionResult;
  }
}
