import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing, svg } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { consume } from "../../common/decorators/consume";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { transform } from "../../common/decorators/transform";
import { fireEvent } from "../../common/dom/fire_event";
import { mainWindow } from "../../common/dom/get_main_window";
import { supportsFeature } from "../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../common/translations/localize";
import {
  formattersContext,
  reducedMotionContext,
  uiContext,
} from "../../data/context";
import type {
  CoverControlMode,
  CoverDrag,
  CoverEntity,
  CoverRequest,
  CoverSwipe,
} from "../../data/cover";
import {
  CoverEntityFeature,
  coverCurrentValue,
  coverHasTiltControls,
  coverModeAttribute,
  coverSupportsPosition,
  coverSupportsSetValue,
  coverSupportsTiltPosition,
  isMoving,
  isOpening,
} from "../../data/cover";
import { UNAVAILABLE } from "../../data/entity/entity";
import type { HomeAssistantFormatters, HomeAssistantUI } from "../../types";
import { coverDrawingStyles } from "./cover-drawing-styles";
import { coverShape } from "./shapes";
import { PointerDragController } from "./pointer-drag-controller";
import type { CoverShape, OpeningDirection } from "./shapes/shared";
import {
  FRAME,
  VIEWBOX_SIZE,
  clampPercent,
  isHorizontal,
} from "./shapes/shared";
import type { SpringOptions } from "./spring";
import { PercentSpring } from "./spring";
import { WaveMotion } from "./wave";

type HandleMotion = "follow" | "drag" | "swipe" | "request" | "return";

type ModeSprings = Record<CoverControlMode, PercentSpring>;

type ModeMotions = Record<CoverControlMode, HandleMotion>;

const SWIPE_SPRING: SpringOptions = { stiffness: 22, damping: 0.8 };
const KEY_COMMIT_DELAY = 500;
const SWIPE_RESISTANCE = 20;
const GAUGE_WIDTH = 16;
const MODES = ["position", "tilt"] as const;

const MOVING_HINT_ANGLE: Record<OpeningDirection, number> = {
  up: 0,
  down: 180,
  left: -90,
};

const SKY_LAYERS = ["sky", "sky-warm", "sky-cool"];

const pillHandle = (cx: number, cy: number, vertical: boolean) =>
  vertical
    ? svg`<rect class="pill-handle" x=${cx - 4} y=${cy - 22} width="8" height="44" rx="4"></rect>`
    : svg`<rect class="pill-handle" x=${cx - 24} y=${cy - 4} width="48" height="8" rx="4"></rect>`;

const swipeResistance = (distance: number) =>
  SWIPE_RESISTANCE * (1 - Math.exp(-Math.max(0, distance) / 30));

const modeSprings = (): ModeSprings => ({
  position: new PercentSpring(),
  tilt: new PercentSpring(),
});

const modeMotions = (): ModeMotions => ({
  position: "follow",
  tilt: "follow",
});

@customElement("ha-state-control-cover")
export class HaStateControlCover extends LitElement {
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

  private _coverSprings = modeSprings();

  private _handleSprings = modeSprings();

  private _handleMotions = modeMotions();

  private _wave = new WaveMotion();

  private _frame?: number;

  private _lastFrame = 0;

  private _keyCommitTimer?: number;

  private _pointer = new PointerDragController(this);

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.stateObj) {
      this._startLoop();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._frame) {
      cancelAnimationFrame(this._frame);
      this._frame = undefined;
    }
    clearTimeout(this._keyCommitTimer);
    this._keyCommitTimer = undefined;
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (!this.stateObj) {
      return;
    }
    if (
      changedProps.has("stateObj") &&
      changedProps.get("stateObj")?.entity_id !== this.stateObj.entity_id
    ) {
      this._resetMotion();
    }
    this._startLoop();
  }

  private _resetMotion() {
    for (const mode of MODES) {
      const value = this._drawingGoal(mode);
      this._coverSprings[mode].jumpTo(value);
      this._handleSprings[mode].jumpTo(value);
    }
    this._handleMotions = modeMotions();
    this._wave.reset(this._coverSprings.position.value);
  }

  private get _shape(): CoverShape {
    return coverShape(this.stateObj.attributes.device_class, this.mode);
  }

  private get _isRtl(): boolean {
    return mainWindow.document.dir === "rtl";
  }

  private get _canSetValue(): boolean {
    return coverSupportsSetValue(this.stateObj, this.mode);
  }

  private get _openCloseOnly(): boolean {
    return (
      this.mode === "position" &&
      !coverSupportsPosition(this.stateObj) &&
      (supportsFeature(this.stateObj, CoverEntityFeature.OPEN) ||
        supportsFeature(this.stateObj, CoverEntityFeature.CLOSE))
    );
  }

  private get _valueUnknown(): boolean {
    if (this.mode === "tilt" && !this._canSetValue) {
      return false;
    }
    return coverCurrentValue(this.stateObj, this.mode) === undefined;
  }

  private get _interactive(): boolean {
    return (
      this.stateObj.state !== UNAVAILABLE &&
      (this._canSetValue || (this._openCloseOnly && !this._valueUnknown))
    );
  }

  private get _valueChanging(): boolean {
    return this._drag !== undefined || this.request?.mode === this.mode;
  }

  private _drawingGoal(mode: CoverControlMode): number {
    const value = coverCurrentValue(this.stateObj, mode);
    if (value !== undefined) {
      return clampPercent(value);
    }
    if (mode === "tilt" && !coverSupportsTiltPosition(this.stateObj)) {
      return 50;
    }
    return this._coverSprings[mode].value;
  }

  private _handleGoal(mode: CoverControlMode): number {
    if (this.request?.mode === mode) {
      return this.request.value;
    }
    return Math.round(this._drawingGoal(mode));
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
    for (const mode of MODES) {
      const goal = this._drawingGoal(mode);
      changed = this._moveSpring(this._coverSprings[mode], goal, dt) || changed;
      changed = this._moveHandle(mode, goal, dt) || changed;
    }
    if (this._shape.usesWave) {
      changed = this._moveWave(dt) || changed;
    }
    if (changed) {
      this.requestUpdate();
      this._frame = requestAnimationFrame(this._tick);
    }
  };

  private _moveSpring(
    spring: PercentSpring,
    goal: number,
    dt: number,
    options?: SpringOptions
  ): boolean {
    return this._reducedMotion
      ? spring.jumpTo(goal)
      : spring.moveTo(goal, dt, options);
  }

  private _moveWave(dt: number): boolean {
    const position = this._coverSprings.position.value;
    if (this._reducedMotion) {
      this._wave.jumpTo(position);
      return false;
    }
    return this._wave.moveTo(position, dt);
  }

  private _handleMotion(mode: CoverControlMode): HandleMotion {
    if (this._drag && this.mode === mode) {
      return this._drag.swipe ? "swipe" : "drag";
    }
    if (this.request?.mode === mode) {
      return "request";
    }
    const previous = this._handleMotions[mode];
    const afterRequest = previous === "request" || previous === "return";
    const distance = Math.abs(
      this._handleSprings[mode].value - this._coverSprings[mode].value
    );
    if (afterRequest && distance > 0.5) {
      return "return";
    }
    return "follow";
  }

  private _moveHandle(
    mode: CoverControlMode,
    goal: number,
    dt: number
  ): boolean {
    const handle = this._handleSprings[mode];
    const motion = this._handleMotion(mode);
    this._handleMotions[mode] = motion;
    switch (motion) {
      case "drag":
        return handle.jumpTo(this._drag!.value);
      case "swipe":
        return this._moveSpring(handle, this._drag!.value, dt, SWIPE_SPRING);
      case "request":
        return this._moveSpring(handle, this.request!.value, dt);
      case "return":
        return this._moveSpring(handle, goal, dt);
      default:
        return handle.jumpTo(this._coverSprings[mode].value);
    }
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
        ? drag.swipe.passedHalfway !== previous.swipe?.passedHalfway
        : drag.value !== previous.value);
    if (changed) {
      fireEvent(this, "cover-drag-changed", { drag });
    }
  }

  private _sendValue(value: number) {
    fireEvent(this, "cover-command", { mode: this.mode, action: "set", value });
  }

  private _pointerValue(ev: PointerEvent, shape: CoverShape) {
    const rect = this._control?.getBoundingClientRect();
    if (!rect?.width || !rect.height) {
      return undefined;
    }
    let x = ((ev.clientX - rect.left) / rect.width) * VIEWBOX_SIZE;
    const y = ((ev.clientY - rect.top) / rect.height) * VIEWBOX_SIZE;
    if (isHorizontal(shape) && this._isRtl) {
      x = VIEWBOX_SIZE - x;
    }
    return shape.valueAt(x, y);
  }

  private _onPointerDown(ev: PointerEvent) {
    if (!this._interactive || ev.button !== 0) {
      return;
    }
    this._commitKeyValue();
    const shape = this._shape;
    this._pointerFocus = true;
    this._control?.focus({ preventScroll: true });
    ev.preventDefault();
    const startPointer = this._pointerValue(ev, shape);
    if (startPointer === undefined) {
      return;
    }
    if (this._openCloseOnly) {
      this._startSwipe(ev, shape, startPointer);
      return;
    }
    this._startDrag(ev, shape, startPointer);
  }

  private _startDrag(
    ev: PointerEvent,
    shape: CoverShape,
    startPointer: number
  ) {
    const startValue =
      this._valueUnknown && this.request?.mode !== this.mode
        ? startPointer
        : this._handleGoal(this.mode);
    this._pointer.start(ev, {
      move: (e) => {
        const pointer = this._pointerValue(e, shape);
        if (pointer === undefined) {
          return;
        }
        const value = startValue + pointer - startPointer;
        this._setDrag({ value: clampPercent(Math.round(value)) });
      },
      drop: () => {
        const value = this._drag?.value;
        this._setDrag(undefined);
        if (value !== undefined) {
          this._sendValue(value);
        }
      },
      tap: (e) => {
        const pointer = this._pointerValue(e, shape);
        if (pointer !== undefined) {
          this._sendValue(clampPercent(Math.round(pointer)));
        }
      },
      cancel: () => this._setDrag(undefined),
    });
  }

  private _swipeAction(): CoverSwipe["action"] {
    const end =
      this.request?.mode === "position"
        ? this.request.value
        : this._drawingGoal("position");
    return end >= 50 ? "close" : "open";
  }

  private _startSwipe(
    ev: PointerEvent,
    shape: CoverShape,
    startPointer: number
  ) {
    const action = this._swipeAction();
    const closing = action === "close";
    if (
      !supportsFeature(
        this.stateObj,
        closing ? CoverEntityFeature.CLOSE : CoverEntityFeature.OPEN
      )
    ) {
      return;
    }
    const direction = closing ? -1 : 1;
    this._pointer.start(ev, {
      move: (e) => {
        const pointer = this._pointerValue(e, shape);
        if (pointer === undefined) {
          return;
        }
        const progress = (pointer - startPointer) * direction;
        const passedHalfway = progress > 50;
        if (
          this._drag?.swipe &&
          this._drag.swipe.passedHalfway !== passedHalfway &&
          "vibrate" in navigator
        ) {
          navigator.vibrate(10);
        }
        const travel = passedHalfway
          ? 100 - swipeResistance(100 - progress)
          : swipeResistance(progress);
        this._setDrag({
          value: closing ? 100 - travel : travel,
          swipe: { action, passedHalfway },
        });
      },
      drop: () => {
        const passedHalfway = Boolean(this._drag?.swipe?.passedHalfway);
        this._setDrag(undefined);
        if (passedHalfway) {
          fireEvent(this, "cover-command", { mode: "position", action });
        }
      },
      tap: (e) => {
        const pointer = this._pointerValue(e, shape);
        if (pointer !== undefined && pointer >= 50 !== closing) {
          fireEvent(this, "cover-command", { mode: "position", action });
        }
      },
      cancel: () => this._setDrag(undefined),
    });
  }

  private _onBlur() {
    this._pointerFocus = false;
    this._commitKeyValue();
  }

  private _onKeyDown(ev: KeyboardEvent) {
    this._pointerFocus = false;
    if (!this._interactive || !this._canSetValue) {
      return;
    }
    const step = this._keyStep(ev);
    if (step === undefined) {
      return;
    }
    ev.preventDefault();
    const current = this._drag?.value ?? this._handleGoal(this.mode);
    this._setDrag({ value: clampPercent(current + step) });
    clearTimeout(this._keyCommitTimer);
    this._keyCommitTimer = window.setTimeout(
      this._commitKeyValue,
      KEY_COMMIT_DELAY
    );
  }

  private _commitKeyValue = () => {
    if (this._keyCommitTimer === undefined) {
      return;
    }
    clearTimeout(this._keyCommitTimer);
    this._keyCommitTimer = undefined;
    const value = this._drag?.value;
    this._setDrag(undefined);
    if (value !== undefined) {
      this._sendValue(value);
    }
  };

  private _keyStep(ev: KeyboardEvent): number | undefined {
    const step = ev.shiftKey ? 10 : 1;
    const horizontalSign = isHorizontal(this._shape) && !this._isRtl ? -1 : 1;
    switch (ev.key) {
      case "ArrowUp":
        return step;
      case "ArrowDown":
        return -step;
      case "ArrowRight":
        return step * horizontalSign;
      case "ArrowLeft":
        return -step * horizontalSign;
      case "PageUp":
        return 10;
      case "PageDown":
        return -10;
      case "Home":
        return -100;
      case "End":
        return 100;
      default:
        return undefined;
    }
  }

  private _formatValue(value: number): string {
    return this._formatters.formatEntityAttributeValue(
      this.stateObj,
      coverModeAttribute(this.mode),
      Math.round(value)
    );
  }

  private _movingHintAngle(shape: CoverShape): number | undefined {
    if (
      this.mode !== "position" ||
      this._valueUnknown ||
      !isMoving(this.stateObj)
    ) {
      return undefined;
    }
    const openingAngle = MOVING_HINT_ANGLE[shape.opens];
    return isOpening(this.stateObj) ? openingAngle : openingAngle + 180;
  }

  private _valueText(value: number): string {
    const current = Math.round(this._drawingGoal(this.mode));
    if (this._valueUnknown && !this._valueChanging) {
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

  private _drawnTilt(): number {
    if (this.mode === "tilt" && this._drag) {
      return this._drag.value;
    }
    return coverHasTiltControls(this.stateObj)
      ? this._coverSprings.tilt.value
      : 0;
  }

  private _renderDefs() {
    const { left, top, width, height } = FRAME;
    return svg`
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="sky-top"></stop>
          <stop offset="1" class="sky-bottom"></stop>
        </linearGradient>
        <radialGradient id="sky-warm" cx="22%" cy="14%" r="58%">
          <stop offset="0" class="sky-warm" stop-opacity="0.55"></stop>
          <stop offset="1" class="sky-warm" stop-opacity="0"></stop>
        </radialGradient>
        <radialGradient id="sky-cool" cx="82%" cy="92%" r="62%">
          <stop offset="0" class="sky-cool" stop-opacity="0.45"></stop>
          <stop offset="1" class="sky-cool" stop-opacity="0"></stop>
        </radialGradient>
        <clipPath id="opening-clip">
          <rect x=${left} y=${top} width=${width} height=${height} rx="12"></rect>
        </clipPath>
      </defs>
    `;
  }

  private _renderSky() {
    const { left, top, width, height } = FRAME;
    return SKY_LAYERS.map(
      (layer) => svg`
        <rect
          x=${left}
          y=${top}
          width=${width}
          height=${height}
          fill="url(#${layer})"
        ></rect>
      `
    );
  }

  private _renderTarget(shape: CoverShape, value: number) {
    return svg`
      ${shape.targetShape?.(value) ?? nothing}
      ${shape.targetLine ? svg`<path class="target-line" d=${shape.targetLine(value)}></path>` : nothing}
    `;
  }

  private _renderHandle(shape: CoverShape, value: number) {
    const [cx, cy] = shape.handleAt(value);
    if (shape.handle !== "gauge") {
      return pillHandle(cx, cy, isHorizontal(shape));
    }
    const [, railTop] = shape.handleAt(100);
    const [, railBottom] = shape.handleAt(0);
    const x = this._isRtl ? VIEWBOX_SIZE - cx : cx;
    return svg`
      <rect
        class="gauge-rail"
        x=${x - GAUGE_WIDTH / 2}
        y=${railTop - GAUGE_WIDTH / 2}
        width=${GAUGE_WIDTH}
        height=${railBottom - railTop + GAUGE_WIDTH}
        rx=${GAUGE_WIDTH / 2}
      ></rect>
      <circle class="gauge-ball" cx=${x} cy=${cy} r=${GAUGE_WIDTH / 2 - 2}></circle>
    `;
  }

  private _renderMovingHint(angle: number) {
    return svg`
      <g transform="translate(${FRAME.centerX} ${FRAME.centerY}) rotate(${angle})">
        <g class="moving-hint">
          <path class="chevron back" d="M-6 6.5 L0 0.5 L6 6.5"></path>
          <path class="chevron" d="M-6 -0.5 L0 -6.5 L6 -0.5"></path>
        </g>
      </g>
    `;
  }

  private _sliderAria(shape: CoverShape, value: number) {
    return {
      label: this._localize(
        this.mode === "tilt"
          ? "ui.card.cover.tilt_position"
          : "ui.card.cover.position"
      ),
      valueNow: String(value),
      valueText: this._valueText(value),
      orientation: isHorizontal(shape)
        ? ("horizontal" as const)
        : ("vertical" as const),
    };
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const shape = this._shape;
    const mode = this.mode;
    const unknown = this._valueUnknown;
    const interactive = this._interactive;
    const changing = this._valueChanging;
    const cover = this._coverSprings[mode].value;
    const handle = this._handleSprings[mode].value;
    const withHandle = interactive && (!unknown || changing);
    const withTarget = changing && (unknown || Math.abs(handle - cover) > 1);
    const parts = shape.render({
      position: this._coverSprings.position.value,
      tilt: this._drawnTilt(),
      wave: this._wave,
    });
    const flip = isHorizontal(shape) && this._isRtl;
    const movingHintAngle = this._movingHintAngle(shape);
    const value = Math.round(this._drag?.value ?? this._handleGoal(mode));
    const slider = interactive && this._canSetValue;
    const aria = slider ? this._sliderAria(shape, value) : undefined;
    const { left, top, width, height } = FRAME;

    return html`
      <div
        class=${classMap({
          control: true,
          interactive,
          disabled: this.stateObj.state === UNAVAILABLE,
          dark: this._darkMode,
          "pointer-focus": this._pointerFocus,
        })}
        role=${ifDefined(aria ? "slider" : undefined)}
        tabindex=${ifDefined(aria ? "0" : undefined)}
        aria-label=${ifDefined(aria?.label)}
        aria-valuemin=${ifDefined(aria ? "0" : undefined)}
        aria-valuemax=${ifDefined(aria ? "100" : undefined)}
        aria-valuenow=${ifDefined(aria?.valueNow)}
        aria-valuetext=${ifDefined(aria?.valueText)}
        aria-orientation=${ifDefined(aria?.orientation)}
        @pointerdown=${this._onPointerDown}
        @keydown=${this._onKeyDown}
        @blur=${this._onBlur}
      >
        <svg viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}" aria-hidden="true">
          ${this._renderDefs()}
          <rect
            class="frame"
            width=${VIEWBOX_SIZE}
            height=${VIEWBOX_SIZE}
            rx="22"
          ></rect>
          <g
            transform=${ifDefined(flip ? `translate(${VIEWBOX_SIZE} 0) scale(-1 1)` : undefined)}
          >
            <g clip-path="url(#opening-clip)">
              ${this._renderSky()} ${parts.back ?? nothing}
              ${unknown ? nothing : parts.cover} ${parts.front ?? nothing}
              ${withTarget ? this._renderTarget(shape, handle) : nothing}
            </g>
            <rect
              class="opening-edge"
              x=${left - 0.5}
              y=${top - 0.5}
              width=${width + 1}
              height=${height + 1}
              rx="12.5"
            ></rect>
            ${movingHintAngle !== undefined ? this._renderMovingHint(movingHintAngle) : nothing}
            ${withHandle ? this._renderHandle(shape, handle) : nothing}
          </g>
        </svg>
      </div>
    `;
  }

  static styles = [
    coverDrawingStyles,
    css`
      :host {
        display: flex;
        justify-content: center;
        width: 100%;
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
      svg {
        display: block;
        width: 100%;
        height: 100%;
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-cover": HaStateControlCover;
  }
}
