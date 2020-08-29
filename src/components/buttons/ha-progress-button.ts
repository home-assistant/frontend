import "@material/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import "../ha-circular-progress";

@customElement("ha-progress-button")
class HaProgressButton extends LitElement {
  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public progress = false;

  public render(): TemplateResult {
    return html`
      <mwc-button
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
    this.classList.add(className);
    setTimeout(() => {
      this.classList.remove(className);
    }, 1000);
  }

  private _buttonTapped(ev: Event): void {
    if (this.progress) {
      ev.stopPropagation();
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        outline: none;
        display: inline-block;
        position: relative;
      }

      mwc-button {
        transition: all 1s;
      }

      .success mwc-button {
        --mdc-theme-primary: white;
        background-color: var(--success-color);
        transition: none;
      }

      .error mwc-button {
        --mdc-theme-primary: white;
        background-color: var(--error-color);
        transition: none;
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
