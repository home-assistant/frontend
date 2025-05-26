import { mdiAlertOctagram, mdiCheckBold } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../ha-button";
import "../ha-spinner";
import "../ha-svg-icon";
import type { Appearance } from "../ha-button";

const HIGHLIGHT_APPEARANCE = {
  accent: "accent" as Appearance,
  filled: "accent" as Appearance,
  plain: "filled" as Appearance,
};

@customElement("ha-progress-button")
export class HaProgressButton extends LitElement {
  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, reflect: true }) public progress = false;

  @property() appearance: Appearance = "accent";

  @property() variant:
    | "primary"
    | "danger"
    | "neutral"
    | "warning"
    | "success" = "primary";

  @state() private _result?: "success" | "error";

  @state() private _hasInitialIcon = false;

  public render(): TemplateResult {
    const appearance =
      this.progress || this._result
        ? HIGHLIGHT_APPEARANCE[this.appearance]
        : this.appearance;

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
        .hideContent=${this._result !== undefined}
      >
        ${this._hasInitialIcon
          ? html`<slot name="icon" slot="prefix"></slot>`
          : nothing}
        <slot
          >${this._result
            ? html`<ha-svg-icon
                .path=${this._result === "success"
                  ? mdiCheckBold
                  : mdiAlertOctagram}
              ></ha-svg-icon>`
            : this.label}</slot
        >
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

  firstUpdated() {
    const iconSlot = this.shadowRoot!.querySelector(
      'slot[name="icon"]'
    ) as HTMLSlotElement;
    this._hasInitialIcon =
      iconSlot && iconSlot.assignedNodes({ flatten: true }).length > 0;
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

    ha-button {
      transition: all 1s;
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
