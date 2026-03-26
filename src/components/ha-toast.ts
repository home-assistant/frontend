// eslint-disable-next-line import/no-extraneous-dependencies
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import { nextRender } from "../common/util/render-status";

export type ToastCloseReason =
  | "dismiss"
  | "action"
  | "timeout"
  | "programmatic";

export interface ToastClosedEventDetail {
  reason: ToastCloseReason;
}

@customElement("ha-toast")
export class HaToast extends LitElement {
  @property({ attribute: "label-text" }) public labelText = "";

  @property({ type: Number, attribute: "timeout-ms" }) public timeoutMs = 4000;

  @query("#toast-anchor")
  private _anchor?: HTMLDivElement;

  @query(".popup")
  private _popup?: HTMLDivElement;

  @query(".toast")
  private _toast?: HTMLDivElement;

  @state() private _active = false;

  @state() private _visible = false;

  private _dismissTimer?: ReturnType<typeof setTimeout>;

  private _closeReason: ToastCloseReason = "programmatic";

  private _transitionId = 0;

  private _cleanupAutoUpdate?: ReturnType<typeof autoUpdate>;

  public disconnectedCallback(): void {
    clearTimeout(this._dismissTimer);
    this._stopPositioning();
    this._transitionId += 1;
    super.disconnectedCallback();
  }

  public async show(): Promise<void> {
    clearTimeout(this._dismissTimer);

    if (this._active && this._visible) {
      this._reposition();
      this._setDismissTimer();
      return;
    }

    const transitionId = ++this._transitionId;

    this._active = true;
    await this.updateComplete;

    if (transitionId !== this._transitionId) {
      return;
    }

    this._startPositioning();
    await nextRender();

    if (transitionId !== this._transitionId) {
      return;
    }

    this._visible = true;
    await this.updateComplete;
    await this._waitForTransitionEnd();

    if (transitionId !== this._transitionId) {
      return;
    }

    this._setDismissTimer();
  }

  public async hide(reason: ToastCloseReason = "programmatic"): Promise<void> {
    clearTimeout(this._dismissTimer);
    this._closeReason = reason;

    if (!this._active) {
      return;
    }

    const transitionId = ++this._transitionId;
    const wasVisible = this._visible;

    this._visible = false;
    await this.updateComplete;

    if (wasVisible) {
      await this._waitForTransitionEnd();
    }

    if (transitionId !== this._transitionId) {
      return;
    }

    this._active = false;
    this._stopPositioning();
    await this.updateComplete;

    fireEvent(this, "toast-closed", {
      reason: this._closeReason,
    });
    this._closeReason = "programmatic";
  }

  public close(reason: ToastCloseReason = "programmatic"): void {
    this.hide(reason);
  }

  private _setDismissTimer() {
    if (this.timeoutMs > 0) {
      this._dismissTimer = setTimeout(() => {
        this.hide("timeout");
      }, this.timeoutMs);
    }
  }

  private _startPositioning(): void {
    const anchor = this._anchor;
    const popup = this._popup;

    if (!anchor || !popup) {
      return;
    }

    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = autoUpdate(anchor, popup, () => {
      this._reposition();
    });

    this._reposition();
  }

  private _stopPositioning(): void {
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = undefined;
  }

  private _reposition(): void {
    const anchor = this._anchor;
    const popup = this._popup;

    if (!anchor || !popup) {
      return;
    }

    computePosition(anchor, popup, {
      placement: "top",
      strategy: "fixed",
      middleware: [offset(16), flip(), shift()],
    }).then(({ x, y }) => {
      Object.assign(popup.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    });
  }

  private async _waitForTransitionEnd(): Promise<void> {
    const toastEl = this._toast;
    if (!toastEl) {
      return;
    }

    const animations = toastEl.getAnimations({ subtree: true });
    if (animations.length === 0) {
      return;
    }

    await Promise.allSettled(animations.map((animation) => animation.finished));
  }

  protected render() {
    return html`
      <div id="toast-anchor" aria-hidden="true"></div>
      ${this._active
        ? html`
            <div class="popup">
              <div
                class=${classMap({
                  toast: true,
                  visible: this._visible,
                })}
                role="status"
                aria-live="polite"
              >
                <span class="message">${this.labelText}</span>
                <div class="actions">
                  <slot name="action"></slot>
                  <slot name="dismiss"></slot>
                </div>
              </div>
            </div>
          `
        : nothing}
    `;
  }

  static override styles = css`
    #toast-anchor {
      position: fixed;
      bottom: var(--safe-area-inset-bottom);
      inset-inline-start: 50%;
      transform: translateX(-50%);
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }

    .popup {
      position: fixed;
      padding: 0;
      border-radius: var(--ha-border-radius-sm);
      box-shadow: var(--wa-shadow-l);
      overflow: hidden;
    }

    .toast {
      box-sizing: border-box;
      min-width: min(
        350px,
        calc(
          100vw - var(--ha-space-4) - var(--safe-area-inset-left) - var(
              --safe-area-inset-right
            )
        )
      );
      max-width: 650px;
      min-height: 48px;
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      padding: var(--ha-space-3);
      color: var(--ha-color-on-neutral-loud);
      background-color: var(--ha-color-neutral-10);
      border-radius: var(--ha-border-radius-sm);
      opacity: 0;
      transform: translateY(var(--ha-space-2));
      transition:
        opacity var(--ha-animation-duration-fast, 150ms) ease,
        transform var(--ha-animation-duration-fast, 150ms) ease;
    }

    .toast.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .message {
      flex: 1;
      min-width: 0;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      color: var(--ha-color-on-neutral-loud);
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      .popup {
        border-radius: var(--ha-border-radius-square);
      }

      .toast {
        min-width: calc(
          100vw - var(--safe-area-inset-left) - var(--safe-area-inset-right)
        );
        border-radius: var(--ha-border-radius-square);
      }
    }
  `;
}

declare global {
  interface HASSDomEvents {
    "toast-closed": ToastClosedEventDetail;
  }

  interface HTMLElementTagNameMap {
    "ha-toast": HaToast;
  }
}
