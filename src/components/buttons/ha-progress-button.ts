import "@material/mwc-button";
import { mdiAlertOctagram, mdiCheckBold } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../ha-circular-progress";
import "../ha-svg-icon";

@customElement("ha-progress-button")
export class HaProgressButton extends LitElement {
  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public progress = false;

  @property({ type: Boolean }) public raised = false;

  @state() private _result?: "success" | "error";

  public render(): TemplateResult {
    const overlay = this._result || this.progress;
    return html`
      <mwc-button
        ?raised=${this.raised}
        .disabled=${this.disabled || this.progress}
        @click=${this._buttonTapped}
        class=${this._result || ""}
      >
        <slot></slot>
      </mwc-button>
      ${!overlay
        ? nothing
        : html`
            <div class="progress">
              ${this._result === "success"
                ? html`<ha-svg-icon .path=${mdiCheckBold}></ha-svg-icon>`
                : this._result === "error"
                ? html`<ha-svg-icon .path=${mdiAlertOctagram}></ha-svg-icon>`
                : this.progress
                ? html`
                    <ha-circular-progress
                      size="small"
                      active
                    ></ha-circular-progress>
                  `
                : ""}
            </div>
          `}
    `;
  }

  public actionSuccess(): void {
    this._setResult("success");
  }

  public actionError(): void {
    this._setResult("error");
  }

  private _setResult(result: "success" | "error"): void {
    this._result = result;
    setTimeout(() => {
      this._result = undefined;
    }, 2000);
  }

  private _buttonTapped(ev: Event): void {
    if (this.progress) {
      ev.stopPropagation();
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        outline: none;
        display: inline-block;
        position: relative;
      }

      mwc-button {
        transition: all 1s;
      }

      mwc-button.success {
        --mdc-theme-primary: white;
        background-color: var(--success-color);
        transition: none;
        border-radius: 4px;
        pointer-events: none;
      }

      mwc-button[raised].success {
        --mdc-theme-primary: var(--success-color);
        --mdc-theme-on-primary: white;
      }

      mwc-button.error {
        --mdc-theme-primary: white;
        background-color: var(--error-color);
        transition: none;
        border-radius: 4px;
        pointer-events: none;
      }

      mwc-button[raised].error {
        --mdc-theme-primary: var(--error-color);
        --mdc-theme-on-primary: white;
      }

      .progress {
        bottom: 4px;
        position: absolute;
        text-align: center;
        top: 4px;
        width: 100%;
      }

      ha-svg-icon {
        color: white;
      }

      mwc-button.success slot,
      mwc-button.error slot {
        visibility: hidden;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-progress-button": HaProgressButton;
  }
}
