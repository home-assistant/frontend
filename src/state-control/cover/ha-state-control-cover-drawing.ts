import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { consume } from "../../common/decorators/consume";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { transform } from "../../common/decorators/transform";
import { fireEvent } from "../../common/dom/fire_event";
import { supportsFeature } from "../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../common/translations/localize";
import {
  formattersContext,
  reducedMotionContext,
  uiContext,
} from "../../data/context";
import type { CoverControlMode, CoverEntity } from "../../data/cover";
import {
  CoverEntityFeature,
  coverIsMoving,
  coverModeValue,
} from "../../data/cover";
import { UNAVAILABLE } from "../../data/entity/entity";
import type { HomeAssistantFormatters, HomeAssistantUI } from "../../types";
import { awningShape } from "./drawing/awning";
import { curtainShape } from "./drawing/curtain";
import { rollerShape, venetianShape } from "./drawing/roller";
import { sashShape } from "./drawing/sash";
import type { CoverShape } from "./drawing/shared";
import { VB } from "./drawing/shared";
import { slatsShape } from "./drawing/slats";
import { slideShape } from "./drawing/slide";

export type CoverService =
  | "open_cover"
  | "close_cover"
  | "stop_cover"
  | "set_cover_position"
  | "open_cover_tilt"
  | "close_cover_tilt"
  | "stop_cover_tilt"
  | "set_cover_tilt_position";

export interface CoverCommand {
  service: CoverService;
  value?: number;
}

export interface CoverRequest {
  mode: CoverControlMode;
  value: number;
}

export interface CoverDrag {
  value: number;
  swipe?: { start: number; flipped: boolean };
}

type HandleMotion = "follow" | "drag" | "snap" | "request" | "hold";

interface ModeValues {
  position: number;
  tilt: number;
}

const SPRING = 7;
const SNAP_SPRING = 22;
const SNAP_DAMPING = 0.55;
const DRAG_THRESHOLD = 6;
const KEY_COMMIT_DELAY = 500;
const SWIPE_RESISTANCE = 20;

const clamp = (value: number) => Math.max(0, Math.min(100, value));

@customElement("ha-state-control-cover-drawing")
export class HaStateControlCoverDrawing extends LitElement {
  @property({ attribute: false }) public stateObj!: CoverEntity;

  @property({ attribute: false }) public mode: CoverControlMode = "position";

  @property({ attribute: false }) public request?: CoverRequest;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: reducedMotionContext, subscribe: true })
  private _reducedMotion = false;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, boolean>({
    transformer: ({ themes }) => themes.darkMode,
  })
  private _darkMode?: boolean;

  @state() private _drag?: CoverDrag;

  @query(".control") private _control?: HTMLElement;

  private _shown: ModeValues = { position: 0, tilt: 0 };

  private _shownVelocity: ModeValues = { position: 0, tilt: 0 };

  private _handle: ModeValues = { position: 0, tilt: 0 };

  private _handleVelocity: ModeValues = { position: 0, tilt: 0 };

  private _holding: Record<CoverControlMode, boolean> = {
    position: false,
    tilt: false,
  };

  private _initialized = false;

  private _frame?: number;

  private _lastFrame = 0;

  private _keyValue?: number;

  private _keyTimer?: number;

  private _stopTracking?: () => void;

  private _id = Math.random().toString(36).slice(2);

  private _isRtl = false;

  public connectedCallback(): void {
    super.connectedCallback();
    this._readDirection();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._frame) {
      cancelAnimationFrame(this._frame);
      this._frame = undefined;
    }
    this._stopTracking?.();
    clearTimeout(this._keyTimer);
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (!this.stateObj) {
      return;
    }
    const oldStateObj = changedProps.get("stateObj") as CoverEntity | undefined;
    if (
      !this._initialized ||
      (oldStateObj && oldStateObj.entity_id !== this.stateObj.entity_id)
    ) {
      this._initialized = true;
      for (const mode of ["position", "tilt"] as const) {
        const value = this._goal(mode);
        this._shown[mode] = value;
        this._handle[mode] = value;
        this._shownVelocity[mode] = 0;
        this._handleVelocity[mode] = 0;
      }
    }
    if (changedProps.has("request")) {
      const oldRequest = changedProps.get("request") as
        CoverRequest | undefined;
      if (oldRequest && !this.request) {
        const value = coverModeValue(this.stateObj, oldRequest.mode);
        this._holding[oldRequest.mode] =
          value !== undefined && Math.round(value) === oldRequest.value;
      }
      if (this.request) {
        this._holding[this.request.mode] = false;
      }
    }
    this._startLoop();
  }

  private get _supportsValue(): boolean {
    return supportsFeature(
      this.stateObj,
      this.mode === "tilt"
        ? CoverEntityFeature.SET_TILT_POSITION
        : CoverEntityFeature.SET_POSITION
    );
  }

  private get _supportsSwipe(): boolean {
    return (
      this.mode === "position" &&
      !supportsFeature(this.stateObj, CoverEntityFeature.SET_POSITION) &&
      (supportsFeature(this.stateObj, CoverEntityFeature.OPEN) ||
        supportsFeature(this.stateObj, CoverEntityFeature.CLOSE))
    );
  }

  private get _unknown(): boolean {
    if (this.mode === "tilt" && !this._supportsValue) {
      return false;
    }
    return coverModeValue(this.stateObj, this.mode) === undefined;
  }

  private get _interactive(): boolean {
    return (
      this.stateObj.state !== UNAVAILABLE &&
      (this._supportsValue || (this._supportsSwipe && !this._unknown))
    );
  }

  private _goal(mode: CoverControlMode): number {
    const value = coverModeValue(this.stateObj, mode);
    if (value !== undefined) {
      return clamp(value);
    }
    if (
      mode === "tilt" &&
      !supportsFeature(this.stateObj, CoverEntityFeature.SET_TILT_POSITION)
    ) {
      return 50;
    }
    return this._shown[mode];
  }

  private _shape(): CoverShape {
    if (this.mode === "tilt") {
      return slatsShape;
    }
    switch (this.stateObj.attributes.device_class) {
      case "awning":
        return awningShape;
      case "curtain":
        return curtainShape;
      case "door":
      case "gate":
        return slideShape;
      case "window":
        return sashShape;
      case "blind":
        return supportsFeature(
          this.stateObj,
          CoverEntityFeature.SET_TILT_POSITION
        ) ||
          supportsFeature(this.stateObj, CoverEntityFeature.OPEN_TILT) ||
          supportsFeature(this.stateObj, CoverEntityFeature.CLOSE_TILT)
          ? venetianShape
          : rollerShape;
      default:
        return rollerShape;
    }
  }

  private _readDirection() {
    this._isRtl = getComputedStyle(this).direction === "rtl";
  }

  private _startLoop() {
    if (this._frame || !this.isConnected) {
      return;
    }
    this._lastFrame = performance.now();
    this._frame = requestAnimationFrame(this._tick);
  }

  private _tick = (time: number) => {
    this._frame = undefined;
    const dt = Math.min(100, time - this._lastFrame) / 1000;
    this._lastFrame = time;
    let changed = false;
    for (const mode of ["position", "tilt"] as const) {
      const goal = this._goal(mode);
      changed =
        this._spring(this._shown, this._shownVelocity, mode, goal, dt) ||
        changed;
      changed = this._moveHandle(mode, goal, dt) || changed;
    }
    if (changed) {
      this.requestUpdate();
      this._frame = requestAnimationFrame(this._tick);
    }
  };

  private _handleMotion(mode: CoverControlMode): HandleMotion {
    if (this._drag && this.mode === mode) {
      return this._drag.swipe ? "snap" : "drag";
    }
    if (this.request?.mode === mode) {
      return "request";
    }
    if (
      this._holding[mode] &&
      Math.abs(this._handle[mode] - this._shown[mode]) > 0.5
    ) {
      return "hold";
    }
    this._holding[mode] = false;
    return "follow";
  }

  private _moveHandle(
    mode: CoverControlMode,
    goal: number,
    dt: number
  ): boolean {
    const handle = this._handle;
    const velocity = this._handleVelocity;
    switch (this._handleMotion(mode)) {
      case "drag":
        return this._spring(
          handle,
          velocity,
          mode,
          this._drag!.value,
          dt,
          true
        );
      case "snap":
        return this._spring(
          handle,
          velocity,
          mode,
          this._drag!.value,
          dt,
          false,
          SNAP_SPRING,
          SNAP_DAMPING
        );
      case "request":
        return this._spring(handle, velocity, mode, this.request!.value, dt);
      case "hold":
        return this._spring(handle, velocity, mode, goal, dt);
      default:
        return this._spring(
          handle,
          velocity,
          mode,
          this._shown[mode],
          dt,
          true
        );
    }
  }

  private _spring(
    values: ModeValues,
    velocities: ModeValues,
    mode: CoverControlMode,
    goal: number,
    dt: number,
    instant = false,
    stiffness = SPRING,
    damping = 1
  ): boolean {
    if (
      instant ||
      this._reducedMotion ||
      (Math.abs(goal - values[mode]) < 0.05 && Math.abs(velocities[mode]) < 0.5)
    ) {
      velocities[mode] = 0;
      if (values[mode] === goal) {
        return false;
      }
      values[mode] = goal;
      return true;
    }
    for (let left = dt; left > 0; left -= 0.016) {
      const step = Math.min(0.016, left);
      velocities[mode] +=
        (stiffness * stiffness * (goal - values[mode]) -
          2 * damping * stiffness * velocities[mode]) *
        step;
      values[mode] += velocities[mode] * step;
      if (values[mode] < 0 || values[mode] > 100) {
        values[mode] = clamp(values[mode]);
        velocities[mode] = 0;
      }
    }
    return true;
  }

  private _trackPointer(
    move: (ev: PointerEvent) => void,
    end: (ev: PointerEvent) => void
  ) {
    this._stopTracking?.();
    const handleEnd = (ev: PointerEvent) => {
      this._stopTracking?.();
      end(ev);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
    this._stopTracking = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
      this._stopTracking = undefined;
    };
  }

  private _setDrag(drag: CoverDrag | undefined) {
    const previous = this._drag;
    this._drag = drag;
    this._startLoop();
    if (!drag && !previous) {
      return;
    }
    const changed =
      !drag ||
      !previous ||
      (drag.swipe
        ? drag.swipe.flipped !== previous.swipe?.flipped
        : drag.value !== previous.value);
    if (changed) {
      fireEvent(this, "cover-drag-changed", { drag });
    }
  }

  private _command(service: CoverService, value?: number) {
    fireEvent(this, "cover-command", { service, value });
  }

  private _commitValue(value: number) {
    if (!Number.isFinite(value)) {
      return;
    }
    this._command(
      this.mode === "tilt" ? "set_cover_tilt_position" : "set_cover_position",
      value
    );
  }

  private _valueFromPointer(
    ev: PointerEvent,
    shape: CoverShape,
    raw = false
  ): number {
    const rect = this._control?.getBoundingClientRect();
    if (!rect?.width || !rect.height) {
      return NaN;
    }
    let x = ((ev.clientX - rect.left) / rect.width) * VB.w;
    const y = ((ev.clientY - rect.top) / rect.height) * VB.h;
    if (shape.horizontal && this._isRtl) {
      x = VB.w - x;
    }
    const value = shape.valueAt(x, y);
    return raw ? value : clamp(Math.round(value));
  }

  private _onPointerDown(ev: PointerEvent) {
    if (!this._interactive || ev.button !== 0) {
      return;
    }
    const shape = this._shape();
    this._readDirection();
    this._control?.focus({ preventScroll: true });
    ev.preventDefault();
    if (this._supportsSwipe) {
      this._swipe(ev, shape);
      return;
    }
    const startPointer = this._valueFromPointer(ev, shape, true);
    const startValue =
      this.request?.mode === this.mode
        ? this.request.value
        : this._unknown
          ? startPointer
          : Math.round(this._goal(this.mode));
    const { clientX: x0, clientY: y0 } = ev;

    const move = (e: PointerEvent) => {
      if (
        !this._drag &&
        Math.hypot(e.clientX - x0, e.clientY - y0) < DRAG_THRESHOLD
      ) {
        return;
      }
      const value =
        startValue + this._valueFromPointer(e, shape, true) - startPointer;
      if (!Number.isFinite(value)) {
        return;
      }
      this._setDrag({ value: clamp(Math.round(value)) });
    };
    const end = (e: PointerEvent) => {
      if (this._drag) {
        const value = this._drag.value;
        this._setDrag(undefined);
        this._commitValue(value);
      } else if (e.type === "pointerup") {
        this._commitValue(this._valueFromPointer(e, shape));
      }
    };
    this._trackPointer(move, end);
  }

  private _swipeStart(): number {
    if (this.request?.mode === "position") {
      return this.request.value;
    }
    return this._goal("position") < 50 ? 0 : 100;
  }

  private _canSwipeTo(start: number): boolean {
    return supportsFeature(
      this.stateObj,
      start ? CoverEntityFeature.CLOSE : CoverEntityFeature.OPEN
    );
  }

  private _swipe(ev: PointerEvent, shape: CoverShape) {
    const start = this._swipeStart();
    if (!this._canSwipeTo(start)) {
      return;
    }
    const direction = start ? -1 : 1;
    const startPointer = this._valueFromPointer(ev, shape, true);
    const { clientX: x0, clientY: y0 } = ev;
    const pull = (distance: number) =>
      SWIPE_RESISTANCE * (1 - Math.exp(-Math.max(0, distance) / 30));

    const move = (e: PointerEvent) => {
      if (
        !this._drag &&
        Math.hypot(e.clientX - x0, e.clientY - y0) < DRAG_THRESHOLD
      ) {
        return;
      }
      const progress =
        (this._valueFromPointer(e, shape, true) - startPointer) * direction;
      if (!Number.isFinite(progress)) {
        return;
      }
      const flipped = progress > 50;
      if (
        this._drag?.swipe &&
        this._drag.swipe.flipped !== flipped &&
        "vibrate" in navigator
      ) {
        navigator.vibrate(10);
      }
      const shown = flipped ? 100 - pull(100 - progress) : pull(progress);
      this._setDrag({
        value: start ? 100 - shown : shown,
        swipe: { start, flipped },
      });
    };
    const end = (e: PointerEvent) => {
      let flipped = false;
      if (this._drag) {
        flipped = Boolean(this._drag.swipe?.flipped);
        this._setDrag(undefined);
      } else if (e.type === "pointerup") {
        const value = this._valueFromPointer(e, shape);
        flipped = Number.isFinite(value) && (value >= 50 ? 100 : 0) !== start;
      }
      if (flipped) {
        this._command(start ? "close_cover" : "open_cover");
      }
    };
    this._trackPointer(move, end);
  }

  private _onKeyDown(ev: KeyboardEvent) {
    if (!this._interactive) {
      return;
    }
    if (this._supportsSwipe) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        const start = this._swipeStart();
        if (this._canSwipeTo(start)) {
          this._command(start ? "close_cover" : "open_cover");
        }
      }
      return;
    }
    const shape = this._shape();
    const horizontal = shape.horizontal;
    this._readDirection();
    const current =
      this._keyValue ??
      (this.request?.mode === this.mode
        ? this.request.value
        : Math.round(this._goal(this.mode)));
    const step = ev.shiftKey ? 10 : 1;
    const rightStep = horizontal ? (this._isRtl ? step : -step) : step;
    let value: number;
    switch (ev.key) {
      case "ArrowUp":
        value = current + step;
        break;
      case "ArrowDown":
        value = current - step;
        break;
      case "ArrowRight":
        value = current + rightStep;
        break;
      case "ArrowLeft":
        value = current - rightStep;
        break;
      case "PageUp":
        value = current + 10;
        break;
      case "PageDown":
        value = current - 10;
        break;
      case "Home":
        value = 0;
        break;
      case "End":
        value = 100;
        break;
      default:
        return;
    }
    ev.preventDefault();
    value = clamp(value);
    this._keyValue = value;
    this._setDrag({ value });
    clearTimeout(this._keyTimer);
    this._keyTimer = window.setTimeout(() => {
      this._keyValue = undefined;
      this._setDrag(undefined);
      this._commitValue(value);
    }, KEY_COMMIT_DELAY);
  }

  private _formatValue(value: number): string {
    return this._formatters.formatEntityAttributeValue(
      this.stateObj,
      this.mode === "tilt" ? "current_tilt_position" : "current_position",
      Math.round(value)
    );
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const shape = this._shape();
    const unknown = this._unknown;
    const interactive = this._interactive;
    const mode = this.mode;
    const active = this._drag !== undefined || this.request?.mode === mode;
    const handleValue =
      interactive && (!unknown || active) ? this._handle[mode] : undefined;
    const showTarget =
      active &&
      (unknown || Math.abs(this._handle[mode] - this._shown[mode]) > 1);
    const { cover, ghost, handle } = shape.render({
      stateObj: this.stateObj,
      value: this._shown.position,
      tilt: this._shown.tilt,
      handle: handleValue,
      target: showTarget ? this._handle[mode] : undefined,
      id: this._id,
    });
    const flip = shape.horizontal && this._isRtl;
    const { x, y, iw, ih } = VB;
    const current = Math.round(this._goal(mode));
    const value = Math.round(
      this._drag?.value ??
        (this.request?.mode === mode ? this.request.value : current)
    );
    const valueText =
      unknown && !active
        ? this._localize("state.default.unknown")
        : !this._drag && this.request?.mode === mode && value !== current
          ? this._localize(
              "ui.dialogs.more_info_control.cover.requested_value_text",
              {
                value: this._formatValue(value),
                current: this._formatValue(current),
              }
            )
          : this._formatValue(value);
    const slider = interactive && this._supportsValue;
    const swipe = interactive && this._supportsSwipe;
    const label = this._formatters.formatEntityAttributeName(
      this.stateObj,
      mode === "tilt" ? "current_tilt_position" : "current_position"
    );

    return html`
      <div
        class=${classMap({
          control: true,
          interactive,
          disabled: this.stateObj.state === UNAVAILABLE,
          moving: coverIsMoving(this.stateObj),
          dark: this._darkMode,
        })}
        role=${ifDefined(slider ? "slider" : swipe ? "switch" : undefined)}
        tabindex=${ifDefined(interactive ? "0" : undefined)}
        aria-label=${ifDefined(interactive ? label : undefined)}
        aria-valuemin=${ifDefined(slider ? "0" : undefined)}
        aria-valuemax=${ifDefined(slider ? "100" : undefined)}
        aria-valuenow=${ifDefined(slider ? String(value) : undefined)}
        aria-valuetext=${ifDefined(slider ? valueText : undefined)}
        aria-orientation=${ifDefined(
          slider ? (shape.horizontal ? "horizontal" : "vertical") : undefined
        )}
        aria-checked=${ifDefined(
          swipe ? (this._swipeStart() === 100 ? "true" : "false") : undefined
        )}
        @pointerdown=${this._onPointerDown}
        @keydown=${this._onKeyDown}
      >
        <svg viewBox="0 0 ${VB.w} ${VB.h}" aria-hidden="true">
          <defs>
            <linearGradient id="${this._id}-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" class="sky-top"></stop>
              <stop offset="1" class="sky-bottom"></stop>
            </linearGradient>
            <linearGradient id="${this._id}-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" class="grass-top"></stop>
              <stop offset="1" class="grass-bottom"></stop>
            </linearGradient>
            <clipPath id="${this._id}-clip">
              <rect x=${x} y=${y} width=${iw} height=${ih} rx="4"></rect>
            </clipPath>
          </defs>
          <rect class="frame" width=${VB.w} height=${VB.h} rx="24"></rect>
          <g
            transform=${ifDefined(flip ? `translate(${VB.w} 0) scale(-1 1)` : undefined)}
          >
            <g clip-path="url(#${this._id}-clip)">
              <rect
                x=${x}
                y=${y}
                width=${iw}
                height=${ih}
                fill="url(#${this._id}-sky)"
              ></rect>
              ${unknown ? nothing : cover}
            </g>
            ${ghost} ${handle}
          </g>
        </svg>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      justify-content: center;
      --cover-drawing-sky-top: #8fcbf2;
      --cover-drawing-sky-bottom: #e3f3fd;
      --cover-drawing-frame: #d6dbe0;
      --cover-drawing-frame-edge: #c3cad1;
      --cover-drawing-fabric: #c4cad1;
      --cover-drawing-fabric-line: #adb4bc;
      --cover-drawing-fabric-edge: #959ea8;
      --cover-drawing-glass: rgba(255, 255, 255, 0.35);
      --cover-drawing-metal: #6f7a84;
      --cover-drawing-grass-top: #a8d49a;
      --cover-drawing-grass-bottom: #7fb071;
      --cover-drawing-handle: #ffffff;
      --cover-drawing-handle-shadow: rgba(0, 0, 0, 0.28);
    }
    .control.dark {
      --cover-drawing-sky-top: #1d2c47;
      --cover-drawing-sky-bottom: #3b5a83;
      --cover-drawing-frame: #3a4148;
      --cover-drawing-frame-edge: #4a525a;
      --cover-drawing-fabric: #5a6069;
      --cover-drawing-fabric-line: #707884;
      --cover-drawing-fabric-edge: #858e99;
      --cover-drawing-glass: rgba(255, 255, 255, 0.08);
      --cover-drawing-metal: #9aa5b0;
      --cover-drawing-grass-top: #3f6b45;
      --cover-drawing-grass-bottom: #2b4a31;
      --cover-drawing-handle: #f2f4f6;
      --cover-drawing-handle-shadow: rgba(0, 0, 0, 0.6);
    }
    .control {
      position: relative;
      flex: none;
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      aspect-ratio: 4 / 5;
      border-radius: var(--ha-border-radius-4xl);
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      outline: none;
      -webkit-tap-highlight-color: transparent;
    }
    .control.interactive {
      cursor: grab;
    }
    .control.interactive:active {
      cursor: grabbing;
    }
    .control:focus-visible {
      box-shadow: 0 0 0 3px var(--primary-color);
    }
    .control.disabled {
      opacity: 0.4;
    }
    .control.moving::after {
      content: "";
      position: absolute;
      inset: -4px;
      border-radius: calc(var(--ha-border-radius-4xl) + 4px);
      border: 2px solid var(--primary-color);
      opacity: 0;
      animation: pulse 1.2s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes pulse {
      50% {
        opacity: 0.8;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .control.moving::after {
        animation: none;
        opacity: 0.7;
      }
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .sky-top {
      stop-color: var(--cover-drawing-sky-top);
    }
    .sky-bottom {
      stop-color: var(--cover-drawing-sky-bottom);
    }
    .grass-top {
      stop-color: var(--cover-drawing-grass-top);
    }
    .grass-bottom {
      stop-color: var(--cover-drawing-grass-bottom);
    }
    .frame {
      fill: var(--cover-drawing-frame);
    }
    .fabric {
      fill: var(--cover-drawing-fabric);
    }
    .fabric.door {
      stroke: var(--cover-drawing-fabric-edge);
    }
    .fabric-line,
    .panel {
      stroke: var(--cover-drawing-fabric-line);
      fill: none;
    }
    .edge,
    .knob {
      fill: var(--cover-drawing-fabric-edge);
    }
    .slat {
      fill: var(--cover-drawing-fabric);
      stroke: var(--cover-drawing-fabric-edge);
      stroke-width: 0.5;
    }
    .metal {
      fill: var(--cover-drawing-metal);
    }
    .glass {
      fill: var(--cover-drawing-glass);
      stroke-width: 6;
    }
    .frame-sash {
      stroke: var(--cover-drawing-frame-edge);
    }
    .sash {
      stroke: var(--cover-drawing-fabric-edge);
    }
    .mullion {
      stroke: var(--cover-drawing-fabric-edge);
      stroke-width: 3;
    }
    .rail {
      fill: var(--card-background-color);
      opacity: 0.85;
    }
    .rail-fill {
      fill: var(--primary-color);
    }
    .handle {
      fill: var(--cover-drawing-handle);
      filter: drop-shadow(0 1px 2px var(--cover-drawing-handle-shadow));
    }
    .knob-handle {
      fill: var(--cover-drawing-handle);
      stroke: var(--primary-color);
      stroke-width: 2.5;
      filter: drop-shadow(0 1px 2px var(--cover-drawing-handle-shadow));
    }
    .target {
      stroke: var(--primary-color);
      stroke-width: 2.5;
      stroke-dasharray: 6 5;
    }
    circle.target {
      stroke-dasharray: 4 3;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-cover-drawing": HaStateControlCoverDrawing;
  }
  interface HASSDomEvents {
    "cover-command": CoverCommand;
    "cover-drag-changed": { drag?: CoverDrag };
  }
}
