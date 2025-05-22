import { mdiAlertOctagram, mdiCheckBold } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../ha-button";
import "../ha-spinner";
import "../ha-svg-icon";

@customElement("ha-progress-button")
export class HaProgressButton extends LitElement {
  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public progress = false;

  @property({ type: Boolean }) public raised = false;

  @property({ type: Boolean }) public unelevated = false;

  @state() private _result?: "success" | "error";

  public render(): TemplateResult {
    const overlay = this._result || this.progress;
    return html`
      <ha-button
        .appearance=${this.unelevated
          ? "accent"
          : this.raised
            ? "filled"
            : "plain"}
        .disabled=${this.disabled || this.progress}
        class=${this._result || ""}
      >
        <slot name="icon" slot="icon"></slot>
        <slot>${this.label}</slot>
      </ha-button>
      ${!overlay
        ? nothing
        : html`
            <div class="progress">
              ${this._result === "success"
                ? html`<ha-svg-icon .path=${mdiCheckBold}></ha-svg-icon>`
                : this._result === "error"
                  ? html`<ha-svg-icon .path=${mdiAlertOctagram}></ha-svg-icon>`
                  : this.progress
                    ? html`<ha-spinner size="small"></ha-spinner>`
                    : nothing}
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

  static styles = css`
    :host {
      outline: none;
      display: inline-block;
      position: relative;
      pointer-events: none;
    }

    ha-button {
      transition: all 1s;
      pointer-events: initial;
    }

    ha-button.success {
      --mdc-theme-primary: white;
      background-color: var(--success-color);
      transition: none;
      border-radius: 4px;
      pointer-events: none;
    }

    ha-button[unelevated].success,
    ha-button[raised].success {
      --mdc-theme-primary: var(--success-color);
      --mdc-theme-on-primary: white;
    }

    ha-button.error {
      --mdc-theme-primary: white;
      background-color: var(--error-color);
      transition: none;
      border-radius: 4px;
      pointer-events: none;
    }

    ha-button[unelevated].error,
    ha-button[raised].error {
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

    ha-button.success slot,
    ha-button.error slot {
      visibility: hidden;
    }
    :host([destructive]) {
      --mdc-theme-primary: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-progress-button": HaProgressButton;
  }
}
