import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

const TOUCH_DELAY_MS = 150;

const MINIMUM_PRESS_MS = 225;

const INITIAL_ORIGIN_SCALE = 0.2;

const PADDING = 10;

const SOFT_EDGE_MINIMUM_SIZE = 75;

const SOFT_EDGE_CONTAINER_RATIO = 0.35;

const EVENTS = [
  "click",
  "contextmenu",
  "pointercancel",
  "pointerdown",
  "pointerenter",
  "pointerleave",
  "pointerup",
  // Clears the press for controls using the action handler, which
  // prevents the click that would otherwise end it.
  "touchend",
];

/**
 * On touch: `inactive -> touch-delay -> waiting-for-click -> inactive`, or
 * `inactive -> touch-delay -> holding -> waiting-for-click -> inactive`.
 * On mouse or pen: `inactive -> waiting-for-click -> inactive`.
 */
type PressState = "inactive" | "touch-delay" | "holding" | "waiting-for-click";

const isTouch = (ev: PointerEvent) => ev.pointerType === "touch";

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Hover and press feedback for the element it is attached to. Attaches to
 * its parent element, or to the element referenced by `for`.
 *
 * @cssprop --ha-ripple-color - Hover and pressed color.
 * @cssprop --ha-ripple-hover-color - Hover color.
 * @cssprop --ha-ripple-pressed-color - Pressed color.
 * @cssprop --ha-ripple-hover-opacity - Hover opacity. Defaults to 0.08.
 * @cssprop --ha-ripple-pressed-opacity - Pressed opacity. Defaults to 0.12.
 */
@customElement("ha-ripple")
export class HaRipple extends LitElement {
  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ attribute: "for", reflect: true }) public htmlFor: string | null =
    null;

  @state() private _hovered = false;

  @state() private _pressed = false;

  @query(".press") private _pressEl?: HTMLElement;

  private _control: HTMLElement | null = null;

  private _attachedControl: HTMLElement | null = null;

  private _state: PressState = "inactive";

  private _startEvent?: PointerEvent;

  private _pressStart?: number;

  public get control(): HTMLElement | null {
    if (this.htmlFor === null) {
      return this._control ?? this.parentElement;
    }

    const root = this.getRootNode();

    if (
      !this.htmlFor ||
      !(root instanceof Document || root instanceof ShadowRoot)
    ) {
      return null;
    }

    const control = root.querySelector(`#${this.htmlFor}`);

    return control instanceof HTMLElement ? control : null;
  }

  public set control(control: HTMLElement | null) {
    if (control) {
      this.attach(control);
    } else {
      this.detach();
    }
  }

  public attach(control: HTMLElement) {
    this._control = control;
    this.htmlFor = null;
    this._listenTo(control);
  }

  public detach() {
    this._control = null;
    this.htmlFor = "";
    this._listenTo(null);
  }

  public connectedCallback() {
    super.connectedCallback();
    // Stops VoiceOver from grouping the ripple with sibling content.
    this.setAttribute("aria-hidden", "true");
    this._listenTo(this.control);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._listenTo(null);
    this._state = "inactive";
    this._startEvent = undefined;
    this._hovered = false;
    this._pressed = false;
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("disabled") && this.disabled) {
      this._hovered = false;
      this._pressed = false;
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    if (changedProps.has("htmlFor") && this.isConnected) {
      this._listenTo(this.control);
    }
  }

  protected render() {
    return html`<div
      class="surface ${classMap({
        hovered: this._hovered,
        pressed: this._pressed,
      })}"
    >
      <div class="hover"></div>
      <div class="press"></div>
    </div>`;
  }

  /** @private */
  public handleEvent(ev: Event) {
    if (
      this.disabled ||
      window.matchMedia?.("(forced-colors: active)").matches
    ) {
      return;
    }

    if (ev.type === "click") {
      this._handleClick();

      return;
    }

    if (ev.type === "contextmenu" || ev.type === "touchend") {
      this._endPress();

      return;
    }

    if (!(ev instanceof PointerEvent) || !this._shouldReact(ev)) {
      return;
    }

    switch (ev.type) {
      case "pointerdown":
        this._handlePointerdown(ev);
        break;
      case "pointerup":
        this._handlePointerup();
        break;
      case "pointercancel":
        this._endPress();
        break;
      case "pointerenter":
        this._hovered = true;
        break;
      case "pointerleave":
        this._hovered = false;

        // Release a held mouse or pen press that moves off the control
        if (this._state !== "inactive") {
          this._endPress();
        }

        break;
    }
  }

  private _listenTo(control: HTMLElement | null) {
    if (control === this._attachedControl) {
      return;
    }

    for (const type of EVENTS) {
      this._attachedControl?.removeEventListener(type, this);
      control?.addEventListener(type, this);
    }

    this._attachedControl = control;
  }

  private _shouldReact(ev: PointerEvent) {
    if (!ev.isPrimary) {
      return false;
    }

    if (this._startEvent && this._startEvent.pointerId !== ev.pointerId) {
      return false;
    }

    if (ev.type === "pointerenter" || ev.type === "pointerleave") {
      return !isTouch(ev);
    }

    return isTouch(ev) || ev.buttons === 1;
  }

  private async _handlePointerdown(ev: PointerEvent) {
    this._startEvent = ev;

    if (!isTouch(ev)) {
      this._state = "waiting-for-click";
      this._startPress(ev);

      return;
    }

    // Wait so that a scroll or swipe does not show a press
    this._state = "touch-delay";
    await wait(TOUCH_DELAY_MS);

    if (this._state !== "touch-delay") {
      return;
    }

    this._state = "holding";
    this._startPress(ev);
  }

  private _handlePointerup() {
    if (this._state === "holding") {
      this._state = "waiting-for-click";

      return;
    }

    if (this._state === "touch-delay") {
      this._state = "waiting-for-click";
      this._startPress(this._startEvent);
    }
  }

  private _handleClick() {
    if (this._state === "waiting-for-click") {
      this._endPress();

      return;
    }

    if (this._state === "inactive") {
      // Click from the keyboard
      this._startPress();
      this._endPress();
    }
  }

  private _startPress(origin?: PointerEvent) {
    const press = this._pressEl;

    if (!press) {
      return;
    }

    this._pressed = true;

    // Measured sizes include CSS zoom, but the sizes set below get zoomed again
    const zoom = "currentCSSZoom" in this ? this.currentCSSZoom : 1;
    const rect = this.getBoundingClientRect();
    const width = rect.width / zoom;
    const height = rect.height / zoom;
    const maxDim = Math.max(width, height);

    const softEdgeSize = Math.max(
      SOFT_EDGE_CONTAINER_RATIO * maxDim,
      SOFT_EDGE_MINIMUM_SIZE
    );

    const initialSize = Math.max(1, Math.floor(maxDim * INITIAL_ORIGIN_SCALE));
    const maxRadius = Math.sqrt(width ** 2 + height ** 2) + PADDING;
    const scale = (maxRadius + softEdgeSize) / initialSize;

    const startX =
      (origin ? (origin.clientX - rect.left) / zoom : width / 2) -
      initialSize / 2;

    const startY =
      (origin ? (origin.clientY - rect.top) / zoom : height / 2) -
      initialSize / 2;

    const endX = (width - initialSize) / 2;
    const endY = (height - initialSize) / 2;

    // Jump to the press point, then grow from there to cover the control
    press.style.transitionProperty = "opacity";
    press.style.width = `${initialSize}px`;
    press.style.height = `${initialSize}px`;
    press.style.transform = `translate(${startX}px, ${startY}px) scale(1)`;
    press.getBoundingClientRect();
    press.style.transitionProperty = "";
    press.style.transform = `translate(${endX}px, ${endY}px) scale(${scale})`;

    this._pressStart = performance.now();
  }

  private async _endPress() {
    this._startEvent = undefined;
    this._state = "inactive";

    const pressStart = this._pressStart;

    const remaining =
      pressStart === undefined
        ? 0
        : MINIMUM_PRESS_MS - (performance.now() - pressStart);

    if (remaining > 0) {
      await wait(remaining);

      // A new press started while waiting and owns the pressed state
      if (this._pressStart !== pressStart) {
        return;
      }
    }

    this._pressed = false;
  }

  static styles = css`
    :host {
      display: flex;
      margin: auto;
      pointer-events: none;
    }
    :host([disabled]) {
      display: none;
    }
    @media (forced-colors: active) {
      :host {
        display: none;
      }
    }
    :host,
    .surface {
      border-radius: inherit;
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      overflow: hidden;
    }
    .surface {
      -webkit-tap-highlight-color: transparent;
    }
    .hover,
    .press {
      position: absolute;
      opacity: 0;
    }
    .hover {
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background-color: var(
        --ha-ripple-hover-color,
        var(--ha-ripple-color, var(--secondary-text-color))
      );
      transition:
        opacity 15ms linear,
        background-color 15ms linear;
    }
    .hovered .hover {
      opacity: var(--ha-ripple-hover-opacity, 0.08);
    }
    .press {
      top: 0;
      left: 0;
      transform-origin: center center;
      background: radial-gradient(
        closest-side,
        var(
            --ha-ripple-pressed-color,
            var(--ha-ripple-color, var(--secondary-text-color))
          )
          65%,
        transparent 100%
      );
      background: radial-gradient(
        closest-side,
        var(
            --ha-ripple-pressed-color,
            var(--ha-ripple-color, var(--secondary-text-color))
          )
          max(100% - 70px, 65%),
        transparent 100%
      );
      transition-property: opacity, transform;
      transition-duration: 375ms, 450ms;
      transition-timing-function: linear, cubic-bezier(0.2, 0, 0, 1);
    }
    .pressed .press {
      opacity: var(--ha-ripple-pressed-opacity, 0.12);
      transition-duration: 105ms, 450ms;
    }
    @media (prefers-reduced-motion: reduce) {
      .press {
        transition-property: opacity;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-ripple": HaRipple;
  }
}
