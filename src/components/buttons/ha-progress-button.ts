import { mdiAlertOctagram, mdiCheckBold } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../ha-button";
import type { Appearance } from "../ha-button";
import "../ha-spinner";
import "../ha-svg-icon";

@customElement("ha-progress-button")
export class HaProgressButton extends LitElement {
  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, reflect: true }) public progress = false;

  @property() appearance: Appearance = "accent";

  @property({ attribute: false }) public iconPath?: string;

  @property() variant: "brand" | "danger" | "neutral" | "warning" | "success" =
    "brand";

  @state() private _result?: "success" | "error";

  public render(): TemplateResult {
    const appearance =
      this.progress || this._result ? "accent" : this.appearance;

    return html`
      <ha-button
        .appearance=${appearance}
        .disabled=${this.disabled}
        .loading=${this.progress}
        .variant=${this._result === "success"
          ? "success"
          : this._result === "error"
            ? "danger"
            : this.variant}
        class=${classMap({
          result: !!this._result,
          success: this._result === "success",
          error: this._result === "error",
        })}
      >
        ${this.iconPath
          ? html`<ha-svg-icon
              .path=${this.iconPath}
              slot="start"
            ></ha-svg-icon>`
          : nothing}

        <slot>${this.label}</slot>
      </ha-button>
      ${!this._result
        ? nothing
        : html`
            <div class="progress">
              ${this._result === "success"
                ? html`<ha-svg-icon .path=${mdiCheckBold}></ha-svg-icon>`
                : this._result === "error"
                  ? html`<ha-svg-icon .path=${mdiAlertOctagram}></ha-svg-icon>`
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
    }

    :host([progress]) {
      pointer-events: none;
    }

    .progress {
      bottom: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      position: absolute;
      top: 0;
      width: 100%;
    }

    ha-button {
      width: 100%;
    }

    ha-button.result::part(start),
    ha-button.result::part(end),
    ha-button.result::part(label),
    ha-button.result::part(caret),
    ha-button.result::part(spinner) {
      visibility: hidden;
    }

    ha-svg-icon {
      color: var(--white-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-progress-button": HaProgressButton;
  }
}
