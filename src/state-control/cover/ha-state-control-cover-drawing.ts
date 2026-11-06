import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing, svg } from "lit";
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
import { CoverEntityFeature, coverModeValue } from "../../data/cover";
import { UNAVAILABLE } from "../../data/entity/entity";
import type { HomeAssistantFormatters, HomeAssistantUI } from "../../types";
import { awningShape } from "./drawing/awning";
import { curtainShape } from "./drawing/curtain";
import { doorShape } from "./drawing/door";
import { hopperShape } from "./drawing/hopper";
import { rollerShape } from "./drawing/roller";
import { sashShape } from "./drawing/sash";
import type { CoverShape, CoverWave } from "./drawing/shared";
import { VB, clamp } from "./drawing/shared";
import { slatsShape } from "./drawing/slats";
import { slideShape } from "./drawing/slide";
import { venetianShape } from "./drawing/venetian";

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

type ModeValues = Record<CoverControlMode, number>;

interface SpringOptions {
  instant?: boolean;
  stiffness?: number;
  damping?: number;
}

const SPRING = 7;
const SNAP_SPRING = 22;
const SNAP_DAMPING = 0.55;
const DRAG_THRESHOLD = 6;
const KEY_COMMIT_DELAY = 500;
const SWIPE_RESISTANCE = 20;

const SKY_LAYERS = ["sky", "warm", "cool"];

const pill = (cx: number, cy: number, vertical: boolean) =>
  vertical
    ? svg`<rect class="handle" x=${cx - 4} y=${cy - 22} width="8" height="44" rx="4"></rect>`
    : svg`<rect class="handle" x=${cx - 24} y=${cy - 4} width="48" height="8" rx="4"></rect>`;

const knob = (cx: number, cy: number) =>
  svg`<circle class="knob-handle" cx=${cx} cy=${cy} r="9"></circle>`;

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

  @state() private _pointerFocus = false;

  @query(".control") private _control?: HTMLElement;

  private _shown: ModeValues = { position: 0, tilt: 0 };

  private _shownVelocity: ModeValues = { position: 0, tilt: 0 };

  private _handle: ModeValues = { position: 0, tilt: 0 };

  private _handleVelocity: ModeValues = { position: 0, tilt: 0 };

  private _wave: CoverWave & { position: number } = {
    position: 0,
    velocity: 0,
    phase: 0,
  };

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
      this._wave = { position: this._shown.position, velocity: 0, phase: 0 };
    }
    if (changedProps.has("request")) {
      const oldRequest = changedProps.get("request") as
        CoverRequest | undefined;
      if (oldRequest && !this.request) {
        this._holding[oldRequest.mode] = true;
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

  private _requestedValue(mode: CoverControlMode): number {
    if (this.request?.mode === mode) {
      return this.request.value;
    }
    return Math.round(this._goal(mode));
  }

  private _shape(): CoverShape {
    const deviceClass = this.stateObj.attributes.device_class;
    if (this.mode === "tilt") {
      return deviceClass === "window" ? hopperShape : slatsShape;
    }
    switch (deviceClass) {
      case "awning":
        return awningShape;
      case "curtain":
        return curtainShape;
      case "door":
        return doorShape;
      case "gate":
        return slideShape;
      case "window":
        return sashShape;
      case "blind":
        return venetianShape;
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
    if (this._shape() === curtainShape) {
      changed = this._moveWave(dt) || changed;
    }
    if (changed) {
      this.requestUpdate();
      this._frame = requestAnimationFrame(this._tick);
    }
  };

  private _moveWave(dt: number): boolean {
    const wave = this._wave;
    const frames = Math.max(0.01, (dt * 1000) / 16.7);
    const keep = 0.9 ** frames;
    const instant = (this._shown.position - wave.position) / frames;
    wave.velocity = wave.velocity * keep + instant * (1 - keep);
    if (Math.abs(wave.velocity) < 0.015 && Math.abs(instant) < 0.001) {
      wave.velocity = 0;
    }
    wave.position = this._shown.position;
    if (!wave.velocity) {
      return false;
    }
    wave.phase += (0.06 + Math.abs(wave.velocity) * 0.03) * frames;
    return true;
  }

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
        return this._spring(handle, velocity, mode, this._drag!.value, dt, {
          instant: true,
        });
      case "snap":
        return this._spring(handle, velocity, mode, this._drag!.value, dt, {
          stiffness: SNAP_SPRING,
          damping: SNAP_DAMPING,
        });
      case "request":
        return this._spring(handle, velocity, mode, this.request!.value, dt);
      case "hold":
        return this._spring(handle, velocity, mode, goal, dt);
      default:
        return this._spring(handle, velocity, mode, this._shown[mode], dt, {
          instant: true,
        });
    }
  }

  private _spring(
    values: ModeValues,
    velocities: ModeValues,
    mode: CoverControlMode,
    goal: number,
    dt: number,
    { instant = false, stiffness = SPRING, damping = 1 }: SpringOptions = {}
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
    const handleCancel = () => {
      this._stopTracking?.();
      this._setDrag(undefined);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleCancel);
    this._stopTracking = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleCancel);
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
    this._pointerFocus = true;
    this._control?.focus({ preventScroll: true });
    ev.preventDefault();
    if (this._supportsSwipe) {
      this._swipe(ev, shape);
      return;
    }
    const startPointer = this._valueFromPointer(ev, shape, true);
    const startValue =
      this._unknown && this.request?.mode !== this.mode
        ? startPointer
        : this._requestedValue(this.mode);
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
      } else {
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
      let flipped: boolean;
      if (this._drag) {
        flipped = Boolean(this._drag.swipe?.flipped);
        this._setDrag(undefined);
      } else {
        const value = this._valueFromPointer(e, shape);
        flipped = Number.isFinite(value) && (value >= 50 ? 100 : 0) !== start;
      }
      if (flipped) {
        this._command(start ? "close_cover" : "open_cover");
      }
    };
    this._trackPointer(move, end);
  }

  private _onBlur() {
    this._pointerFocus = false;
  }

  private _onKeyDown(ev: KeyboardEvent) {
    this._pointerFocus = false;
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
    this._readDirection();
    const current = this._keyValue ?? this._requestedValue(this.mode);
    const step = ev.shiftKey ? 10 : 1;
    const rightStep = this._shape().horizontal && !this._isRtl ? -step : step;
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

  private _movingAngle(shape: CoverShape): number | undefined {
    if (
      this.mode !== "position" ||
      shape.openingAngle === undefined ||
      this._unknown
    ) {
      return undefined;
    }
    if (this.stateObj.state === "opening") {
      return shape.openingAngle;
    }
    if (this.stateObj.state === "closing") {
      return shape.openingAngle + 180;
    }
    return undefined;
  }

  private _valueText(value: number, active: boolean): string {
    const current = Math.round(this._goal(this.mode));
    if (this._unknown && !active) {
      return this._localize("state.default.unknown");
    }
    if (!this._drag && this.request?.mode === this.mode && value !== current) {
      return this._localize(
        "ui.dialogs.more_info_control.cover.requested_value_text",
        {
          value: this._formatValue(value),
          current: this._formatValue(current),
        }
      );
    }
    return this._formatValue(value);
  }

  private _renderTarget(shape: CoverShape, value: number) {
    return svg`
      ${shape.silhouette?.(value, this._id) ?? nothing}
      ${shape.edge ? svg`<path class="target-edge" d=${shape.edge(value)}></path>` : nothing}
    `;
  }

  private _renderHandle(shape: CoverShape, value: number) {
    const [cx, cy] = shape.grip(value);
    return shape.knob ? knob(cx, cy) : pill(cx, cy, shape.horizontal);
  }

  private _renderMovingHint(angle: number) {
    const { x, y, iw, ih } = VB;
    return svg`
      <g transform="translate(${x + iw / 2} ${y + ih / 2}) rotate(${angle})">
        <g class="moving-hint">
          <path class="chevron back" d="M-6 6.5 L0 0.5 L6 6.5"></path>
          <path class="chevron" d="M-6 -0.5 L0 -6.5 L6 -0.5"></path>
        </g>
      </g>
    `;
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const shape = this._shape();
    const mode = this.mode;
    const unknown = this._unknown;
    const interactive = this._interactive;
    const active = this._drag !== undefined || this.request?.mode === mode;
    const withHandle = interactive && (!unknown || active);
    const withTarget =
      active &&
      (unknown || Math.abs(this._handle[mode] - this._shown[mode]) > 1);
    const { back, cover, front } = shape.render({
      stateObj: this.stateObj,
      value: this._shown.position,
      tilt: this._shown.tilt,
      withHandle,
      wave: this._wave,
      id: this._id,
    });
    const flip = shape.horizontal && this._isRtl;
    const movingAngle = this._movingAngle(shape);
    const value = Math.round(this._drag?.value ?? this._requestedValue(mode));
    const slider = interactive && this._supportsValue;
    const swipe = interactive && this._supportsSwipe;
    const { x, y, iw, ih } = VB;

    return html`
      <div
        class=${classMap({
          control: true,
          interactive,
          disabled: this.stateObj.state === UNAVAILABLE,
          dark: this._darkMode,
          "pointer-focus": this._pointerFocus,
        })}
        role=${ifDefined(slider ? "slider" : swipe ? "switch" : undefined)}
        tabindex=${ifDefined(interactive ? "0" : undefined)}
        aria-label=${ifDefined(
          interactive
            ? this._formatters.formatEntityAttributeName(
                this.stateObj,
                mode === "tilt" ? "current_tilt_position" : "current_position"
              )
            : undefined
        )}
        aria-valuemin=${ifDefined(slider ? "0" : undefined)}
        aria-valuemax=${ifDefined(slider ? "100" : undefined)}
        aria-valuenow=${ifDefined(slider ? String(value) : undefined)}
        aria-valuetext=${ifDefined(
          slider ? this._valueText(value, active) : undefined
        )}
        aria-orientation=${ifDefined(
          slider ? (shape.horizontal ? "horizontal" : "vertical") : undefined
        )}
        aria-checked=${ifDefined(
          swipe ? (this._swipeStart() === 100 ? "true" : "false") : undefined
        )}
        @pointerdown=${this._onPointerDown}
        @keydown=${this._onKeyDown}
        @blur=${this._onBlur}
      >
        <svg viewBox="0 0 ${VB.w} ${VB.h}" aria-hidden="true">
          <defs>
            <linearGradient id="${this._id}-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" class="sky-top"></stop>
              <stop offset="1" class="sky-bottom"></stop>
            </linearGradient>
            <radialGradient id="${this._id}-warm" cx="22%" cy="14%" r="58%">
              <stop offset="0" class="sky-warm" stop-opacity="0.55"></stop>
              <stop offset="1" class="sky-warm" stop-opacity="0"></stop>
            </radialGradient>
            <radialGradient id="${this._id}-cool" cx="82%" cy="92%" r="62%">
              <stop offset="0" class="sky-cool" stop-opacity="0.45"></stop>
              <stop offset="1" class="sky-cool" stop-opacity="0"></stop>
            </radialGradient>
            <linearGradient id="${this._id}-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" class="grass-top"></stop>
              <stop offset="1" class="grass-bottom"></stop>
            </linearGradient>
            <filter
              id="${this._id}-box"
              x="-5%"
              y="-50%"
              width="110%"
              height="300%"
            >
              <feDropShadow
                dx="0"
                dy="1.2"
                stdDeviation="1.2"
                flood-color="#000"
                flood-opacity="0.18"
              ></feDropShadow>
            </filter>
            <clipPath id="${this._id}-clip">
              <rect x=${x} y=${y} width=${iw} height=${ih} rx="12"></rect>
            </clipPath>
          </defs>
          <rect class="frame" width=${VB.w} height=${VB.h} rx="22"></rect>
          <g
            transform=${ifDefined(flip ? `translate(${VB.w} 0) scale(-1 1)` : undefined)}
          >
            <g clip-path="url(#${this._id}-clip)">
              ${SKY_LAYERS.map(
                (layer) => svg`
                  <rect
                    x=${x}
                    y=${y}
                    width=${iw}
                    height=${ih}
                    fill="url(#${this._id}-${layer})"
                  ></rect>
                `
              )}
              ${back ?? nothing} ${unknown ? nothing : cover}
              ${front ?? nothing}
              ${withTarget ? this._renderTarget(shape, this._handle[mode]) : nothing}
            </g>
            <rect
              class="opening-edge"
              x=${x - 0.5}
              y=${y - 0.5}
              width=${iw + 1}
              height=${ih + 1}
              rx="12.5"
            ></rect>
            ${movingAngle !== undefined ? this._renderMovingHint(movingAngle) : nothing}
            ${withHandle ? this._renderHandle(shape, this._handle[mode]) : nothing}
          </g>
        </svg>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      justify-content: center;
      width: 100%;
      --cover-drawing-sky-top: #9ed3f6;
      --cover-drawing-sky-bottom: #3f97e6;
      --cover-drawing-sky-warm: #ffffff;
      --cover-drawing-sky-cool: #2b86d9;
      --cover-drawing-frame: color-mix(
        in srgb,
        var(--disabled-color) 20%,
        var(--ha-dialog-surface-background, var(--card-background-color))
      );
      --cover-drawing-frame-edge: #e6e0d8;
      --cover-drawing-fabric: #e1e1e1;
      --cover-drawing-fabric-edge: #bdbdbd;
      --cover-drawing-seam: #bdbdbd;
      --cover-drawing-lift: #f5f5f5;
      --cover-drawing-stripe: #ffffff;
      --cover-drawing-door: #fbf9f6;
      --cover-drawing-slot: #cfe8fb;
      --cover-drawing-ghost: #e1e1e1;
      --cover-drawing-glass: rgba(255, 255, 255, 0.3);
      --cover-drawing-metal: #6f7a84;
      --cover-drawing-grass-top: #a8d49a;
      --cover-drawing-grass-bottom: #7fb071;
      --cover-drawing-handle: #ffffff;
      --cover-drawing-handle-shadow: rgba(0, 0, 0, 0.28);
    }
    .control.dark {
      --cover-drawing-sky-top: #1a2140;
      --cover-drawing-sky-bottom: #2c5490;
      --cover-drawing-sky-warm: #3e59a6;
      --cover-drawing-sky-cool: #0a1733;
      --cover-drawing-frame-edge: #3a4149;
      --cover-drawing-fabric: #5a6069;
      --cover-drawing-fabric-edge: #858e99;
      --cover-drawing-seam: #464b53;
      --cover-drawing-lift: #6e757e;
      --cover-drawing-stripe: #676e78;
      --cover-drawing-door: #6b727c;
      --cover-drawing-slot: #3b5f96;
      --cover-drawing-ghost: #9aa3ad;
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
      width: clamp(200px, 45vh, 300px);
      max-width: 100%;
      aspect-ratio: 1 / 1;
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
    .control:focus-visible:not(.pointer-focus) {
      box-shadow: 0 0 0 3px var(--primary-color);
    }
    .control.disabled {
      opacity: 0.4;
    }
    .moving-hint {
      animation: drift 1.4s linear infinite;
    }
    .chevron {
      fill: none;
      stroke: var(--cover-drawing-handle);
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0.8;
      filter: drop-shadow(0 1px 1.5px var(--cover-drawing-handle-shadow));
    }
    .chevron.back {
      opacity: 0.45;
    }
    @keyframes drift {
      from {
        transform: translateY(4px);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      to {
        transform: translateY(-4px);
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .moving-hint {
        animation: none;
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
    .sky-warm {
      stop-color: var(--cover-drawing-sky-warm);
    }
    .sky-cool {
      stop-color: var(--cover-drawing-sky-cool);
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
    .opening-edge {
      fill: none;
      stroke: var(--cover-drawing-frame);
      stroke-width: 3;
    }
    .fabric {
      fill: var(--cover-drawing-fabric);
    }
    .stripe {
      fill: var(--cover-drawing-stripe);
    }
    .edge {
      fill: var(--cover-drawing-fabric-edge);
    }
    .seam,
    .cord {
      fill: var(--cover-drawing-seam);
    }
    .seam.faint {
      opacity: 0.5;
    }
    .cord {
      opacity: 0.85;
    }
    .lift {
      fill: var(--cover-drawing-lift);
      opacity: 0.75;
    }
    .slat-line {
      stroke: var(--cover-drawing-fabric-edge);
    }
    .slot {
      fill: var(--cover-drawing-slot);
    }
    .panel-shadow {
      fill: #000;
    }
    .floor {
      fill: var(--cover-drawing-seam);
      opacity: 0.55;
    }
    .door {
      fill: var(--cover-drawing-door);
    }
    .door-frame {
      fill: none;
      stroke: var(--cover-drawing-seam);
      stroke-width: 5;
      stroke-linejoin: round;
    }
    .ghost {
      fill: var(--cover-drawing-ghost);
    }
    .target-edge {
      fill: none;
      stroke: var(--cover-drawing-handle);
      stroke-width: 2;
      stroke-linecap: round;
      filter: drop-shadow(0 1px 1.5px var(--cover-drawing-handle-shadow));
    }
    .metal {
      fill: var(--cover-drawing-metal);
    }
    .window-frame {
      fill: none;
      stroke: var(--cover-drawing-frame-edge);
      stroke-width: 8;
    }
    .glass {
      fill: var(--cover-drawing-glass);
    }
    .sash {
      stroke: var(--cover-drawing-fabric-edge);
      stroke-width: 5;
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
      fill: none;
      stroke: var(--primary-color);
      stroke-width: 2.5;
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
