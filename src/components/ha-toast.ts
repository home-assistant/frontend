import "@home-assistant/webawesome/dist/components/popover/popover";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";

@customElement("ha-toast")
export class HaToast extends LitElement {
  @property({ attribute: "label-text" }) public labelText = "";

  @property({ type: Number, attribute: "timeout-ms" }) public timeoutMs = 4000;

  @query("wa-popover")
  private _popover?: HTMLElementTagNameMap["wa-popover"];

  private _dismissTimer?: ReturnType<typeof setTimeout>;

  public disconnectedCallback(): void {
    clearTimeout(this._dismissTimer);
    super.disconnectedCallback();
  }

  public async show(): Promise<void> {
    await this.updateComplete;
    await this._popover?.show();

    clearTimeout(this._dismissTimer);
    if (this.timeoutMs > 0) {
      this._dismissTimer = setTimeout(() => {
        this.hide();
      }, this.timeoutMs);
    }
  }

  public async hide(): Promise<void> {
    clearTimeout(this._dismissTimer);
    await this._popover?.hide();
  }

  public close(_reason?: string): void {
    this.hide();
  }

  private _handleAfterHide() {
    this.dispatchEvent(
      new Event("MDCSnackbar:closed", { bubbles: true, composed: true })
    );
  }

  protected render() {
    return html`
      <button id="toast-anchor" aria-hidden="true" tabindex="-1"></button>
      <wa-popover
        for="toast-anchor"
        placement="top"
        distance="16"
        skidding="0"
        without-arrow
        @wa-after-hide=${this._handleAfterHide}
      >
        <div class="toast" role="status" aria-live="polite">
          <span class="message">${this.labelText}</span>
          <div class="actions">
            <slot name="action"></slot>
            <slot name="dismiss"></slot>
          </div>
        </div>
      </wa-popover>
    `;
  }

  static override styles = css`
    #toast-anchor {
      position: fixed;
      bottom: calc(8px + var(--safe-area-inset-bottom));
      inset-inline-start: 50%;
      transform: translateX(-50%);
      width: 1px;
      height: 1px;
      border: 0;
      opacity: 0;
      pointer-events: none;
    }

    wa-popover {
      --arrow-size: 0;
      --max-width: min(
        650px,
        calc(
          100vw -
            16px - var(--safe-area-inset-left) - var(--safe-area-inset-right)
        )
      );
      --show-duration: var(--ha-animation-duration-fast, 150ms);
      --hide-duration: var(--ha-animation-duration-fast, 150ms);
    }

    wa-popover::part(body) {
      padding: 0;
      border-radius: 4px;
    }

    .toast {
      box-sizing: border-box;
      min-width: min(
        350px,
        calc(
          100vw -
            16px - var(--safe-area-inset-left) - var(--safe-area-inset-right)
        )
      );
      max-width: 650px;
      min-height: 48px;
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      padding: var(--ha-space-2) var(--ha-space-3);
      color: var(--inverse-primary-text-color);
      background-color: var(--inverse-surface-color);
    }

    .message {
      flex: 1;
      min-width: 0;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      color: rgba(255, 255, 255, 0.87);
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      .toast {
        min-width: calc(
          100vw - var(--safe-area-inset-left) - var(--safe-area-inset-right)
        );
        border-radius: 0;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-toast": HaToast;
  }
}
