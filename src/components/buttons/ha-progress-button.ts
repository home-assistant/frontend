import "@material/mwc-button";
import type { Button } from "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../ha-circular-progress";

@customElement("ha-progress-button")
export class HaProgressButton extends LitElement {
  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public progress = false;

  @property({ type: Boolean }) public raised = false;

  @query("mwc-button", true) private _button?: Button;

  public render(): TemplateResult {
    return html`
      <mwc-button
        ?raised=${this.raised}
        .disabled=${this.disabled || this.progress}
        @click=${this._buttonTapped}
      >
        <slot></slot>
      </mwc-button>
      ${this.progress
        ? html`<div class="progress">
            <ha-circular-progress size="small" active></ha-circular-progress>
          </div>`
        : ""}
    `;
  }

  public actionSuccess(): void {
    this._tempClass("success");
  }

  public actionError(): void {
    this._tempClass("error");
  }

  private _tempClass(className: string): void {
    this._button!.classList.add(className);
    setTimeout(() => {
      this._button!.classList.remove(className);
    }, 1000);
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
      }

      mwc-button[raised].success {
        --mdc-theme-primary: var(--success-color);
        --mdc-theme-on-primary: white;
      }

      mwc-button.error {
        --mdc-theme-primary: white;
        background-color: var(--error-color);
        transition: none;
      }

      mwc-button[raised].error {
        --mdc-theme-primary: var(--error-color);
        --mdc-theme-on-primary: white;
      }

      .progress {
        bottom: 0;
        margin-top: 4px;
        position: absolute;
        text-align: center;
        top: 0;
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-progress-button": HaProgressButton;
  }
}
