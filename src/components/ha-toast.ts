import { css, html, LitElement } from "lit";
import { classMap } from "lit/directives/class-map";
import {
  customElement,
  property,
  query,
  queryAssignedElements,
  state,
} from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import { popoverSupported } from "../common/feature-detect/support-popover";
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

  @query(".toast")
  private _toast?: HTMLDivElement;

  @queryAssignedElements({ slot: "action", flatten: true })
  private _actionElements?: Element[];

  @queryAssignedElements({ slot: "dismiss", flatten: true })
  private _dismissElements?: Element[];

  @state() private _active = false;

  @state() private _visible = false;

  private _dismissTimer?: ReturnType<typeof setTimeout>;

  private _closeReason: ToastCloseReason = "programmatic";

  private _transitionId = 0;

  public disconnectedCallback(): void {
    clearTimeout(this._dismissTimer);
    this._transitionId += 1;
    super.disconnectedCallback();
  }

  public async show(): Promise<void> {
    clearTimeout(this._dismissTimer);

    if (this._active && this._visible) {
      this._setDismissTimer();
      return;
    }

    const transitionId = ++this._transitionId;

    this._active = true;
    await this.updateComplete;

    if (transitionId !== this._transitionId) {
      return;
    }

    this._showToastPopover();
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

    this._hideToastPopover();
    this._active = false;
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

  private _isPopoverOpen(): boolean {
    if (!this._toast || !popoverSupported) {
      return false;
    }

    try {
      return this._toast.matches(":popover-open");
    } catch {
      return false;
    }
  }

  private _showToastPopover(): void {
    if (!this._toast || !popoverSupported || this._isPopoverOpen()) {
      return;
    }

    this._toast.showPopover?.();
  }

  private _hideToastPopover(): void {
    if (!this._toast || !popoverSupported || !this._isPopoverOpen()) {
      return;
    }

    this._toast.hidePopover?.();
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
    const hasAction =
      (this._actionElements?.length ?? 0) > 0 ||
      (this._dismissElements?.length ?? 0) > 0;

    return html`
      <div
        class=${classMap({
          toast: true,
          active: this._active,
          visible: this._visible,
        })}
        role="status"
        aria-live="polite"
        popover=${ifDefined(popoverSupported ? "manual" : undefined)}
      >
        <span class="message">${this.labelText}</span>
        <div class=${classMap({ actions: true, "has-action": hasAction })}>
          <slot name="action"></slot>
          <slot name="dismiss"></slot>
        </div>
      </div>
    `;
  }

  static override styles = css`
    .toast {
      position: fixed;
      inset-block-start: auto;
      inset-inline-end: auto;
      inset-block-end: calc(
        var(--safe-area-inset-bottom, 0px) + var(--ha-space-4)
      );
      inset-inline-start: 50%;
      margin: 0;
      width: max-content;
      height: auto;
      border: none;
      overflow: hidden;
      box-sizing: border-box;
      min-width: min(350px, calc(var(--safe-width) - var(--ha-space-4)));
      max-width: min(650px, var(--safe-width));
      min-height: 48px;
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      padding: var(--ha-space-3);
      color: var(--ha-color-on-neutral-loud);
      background-color: var(--ha-color-neutral-10);
      border-radius: var(--ha-border-radius-sm);
      box-shadow: var(--wa-shadow-l);
      opacity: 0;
      transform: translate(-50%, var(--ha-space-2));
      transition:
        opacity var(--ha-animation-duration-fast, 150ms) ease,
        transform var(--ha-animation-duration-fast, 150ms) ease;
    }

    .toast:not(.active) {
      display: none;
    }

    .toast.visible {
      opacity: 1;
      transform: translate(-50%, 0);
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

    .actions:not(.has-action) {
      display: none;
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      .toast {
        min-width: var(--safe-width);
        max-width: var(--safe-width);
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
