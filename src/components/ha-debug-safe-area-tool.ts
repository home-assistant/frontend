import type { ContextType } from "@lit/context";
import { mdiClose, mdiCropFree } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../common/decorators/consume";
import { storage } from "../common/decorators/storage";
import type { DebugSafeArea } from "../common/util/debug-safe-area";
import {
  applyDebugSafeArea,
  DEBUG_SAFE_AREA_STORAGE_KEY,
} from "../common/util/debug-safe-area";
import { internationalizationContext } from "../data/context";
import "./ha-button";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./ha-switch";
import type { HaSwitch } from "./ha-switch";
import "./input/ha-input";
import type { HaInput } from "./input/ha-input";

type Side = "top" | "bottom" | "left" | "right";

const SIDES: Side[] = ["top", "bottom", "left", "right"];

const PRESETS = {
  none: { top: 0, right: 0, bottom: 0, left: 0 },
  portrait: { top: 62, right: 0, bottom: 34, left: 0 },
  landscape: { top: 0, right: 62, bottom: 21, left: 62 },
} as const;

type Preset = keyof typeof PRESETS;

const BUBBLE_SIZE = 48;

const BUBBLE_MARGIN = 16;

const DRAG_THRESHOLD = 4;

const DEFAULT_SAFE_AREA: DebugSafeArea = {
  ...PRESETS.none,
  highlight: true,
};

interface DragStart {
  pointerX: number;
  pointerY: number;
  right: number;
  bottom: number;
  moved: boolean;
}

@customElement("ha-debug-safe-area-tool")
export class HaDebugSafeAreaTool extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  @storage({ key: DEBUG_SAFE_AREA_STORAGE_KEY, state: true, subscribe: false })
  private _config: DebugSafeArea = DEFAULT_SAFE_AREA;

  @state() private _open = false;

  @state() private _position = { right: BUBBLE_MARGIN, bottom: BUBBLE_MARGIN };

  private _dragStart?: DragStart;

  private _dragged = false;

  public connectedCallback() {
    super.connectedCallback();
    applyDebugSafeArea(this._config);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    applyDebugSafeArea(undefined);
  }

  protected render() {
    if (!this._i18n) {
      return nothing;
    }
    const { localize } = this._i18n;
    const { right, bottom } = this._position;
    return html`
      <div
        class=${classMap({
          tool: true,
          above: bottom < window.innerHeight / 2,
          end: right < window.innerWidth / 2,
        })}
        style=${styleMap({
          right: `clamp(0px, ${right}px, calc(100vw - ${BUBBLE_SIZE}px))`,
          bottom: `clamp(0px, ${bottom}px, calc(100vh - ${BUBBLE_SIZE}px))`,
        })}
      >
        <button
          class="bubble"
          type="button"
          aria-label=${localize("ui.components.safe_area_tool.title")}
          aria-expanded=${this._open}
          @pointerdown=${this._pointerDown}
          @pointermove=${this._pointerMove}
          @pointerup=${this._pointerUp}
          @click=${this._toggleOpen}
        >
          <ha-svg-icon .path=${mdiCropFree}></ha-svg-icon>
        </button>
        ${
          this._open
            ? html`
                <div class="panel">
                  <div class="header">
                    <span
                      >${localize("ui.components.safe_area_tool.title")}</span
                    >
                    <ha-icon-button
                      .label=${localize("ui.common.close")}
                      .path=${mdiClose}
                      @click=${this._toggleOpen}
                    ></ha-icon-button>
                  </div>
                  <div class="presets">
                    ${(Object.keys(PRESETS) as Preset[]).map(
                      (preset) => html`
                        <ha-button
                          size="s"
                          appearance="outlined"
                          data-preset=${preset}
                          @click=${this._applyPreset}
                        >
                          ${localize(
                            `ui.components.safe_area_tool.presets.${preset}`
                          )}
                        </ha-button>
                      `
                    )}
                  </div>
                  <div class="sides">
                    <div class="screen" aria-hidden="true"></div>
                    ${SIDES.map(
                      (side) => html`
                        <ha-input
                          class=${side}
                          appearance="outlined"
                          type="number"
                          min="0"
                          without-spin-buttons
                          .label=${localize(
                            `ui.components.safe_area_tool.${side}`
                          )}
                          data-side=${side}
                          .value=${String(this._config[side])}
                          @change=${this._sideChanged}
                        ></ha-input>
                      `
                    )}
                  </div>
                  <label class="highlight">
                    ${localize("ui.components.safe_area_tool.highlight")}
                    <ha-switch
                      .checked=${this._config.highlight}
                      @change=${this._highlightChanged}
                    ></ha-switch>
                  </label>
                </div>
              `
            : nothing
        }
      </div>
    `;
  }

  private _update(config: DebugSafeArea) {
    this._config = config;
    applyDebugSafeArea(config);
  }

  private _applyPreset(ev: Event) {
    const preset = (ev.currentTarget as HTMLElement).dataset.preset as Preset;
    this._update({ ...this._config, ...PRESETS[preset] });
  }

  private _sideChanged(ev: Event) {
    const input = ev.currentTarget as HaInput;
    const side = input.dataset.side as Side;
    const value = Math.max(0, Number(input.value) || 0);
    this._update({ ...this._config, [side]: value });
  }

  private _highlightChanged(ev: Event) {
    this._update({
      ...this._config,
      highlight: (ev.currentTarget as HaSwitch).checked,
    });
  }

  private _toggleOpen() {
    if (this._dragged) {
      this._dragged = false;
      return;
    }
    this._open = !this._open;
  }

  private _pointerDown(ev: PointerEvent) {
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this._dragStart = {
      pointerX: ev.clientX,
      pointerY: ev.clientY,
      ...this._position,
      moved: false,
    };
  }

  private _pointerMove(ev: PointerEvent) {
    const start = this._dragStart;
    if (!start) {
      return;
    }
    const dx = ev.clientX - start.pointerX;
    const dy = ev.clientY - start.pointerY;
    if (!start.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
      return;
    }
    start.moved = true;
    this._position = {
      right: Math.min(
        Math.max(start.right - dx, 0),
        window.innerWidth - BUBBLE_SIZE
      ),
      bottom: Math.min(
        Math.max(start.bottom - dy, 0),
        window.innerHeight - BUBBLE_SIZE
      ),
    };
  }

  private _pointerUp() {
    this._dragged = !!this._dragStart?.moved;
    this._dragStart = undefined;
  }

  static styles = css`
    .tool {
      position: fixed;
      z-index: 2147483647;
    }
    .bubble {
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${BUBBLE_SIZE}px;
      height: ${BUBBLE_SIZE}px;
      padding: 0;
      border: none;
      border-radius: var(--ha-border-radius-circle);
      background-color: var(--error-color);
      color: var(--text-primary-color);
      box-shadow: var(--ha-box-shadow-m);
      cursor: grab;
      touch-action: none;
    }
    .bubble:active {
      cursor: grabbing;
    }
    .panel {
      position: absolute;
      top: calc(100% + var(--ha-space-2));
      left: 0;
      box-sizing: border-box;
      width: 300px;
      padding: var(--ha-space-2) var(--ha-space-3) var(--ha-space-3);
      border-radius: var(--ha-border-radius-lg);
      background-color: var(--card-background-color);
      color: var(--primary-text-color);
      box-shadow: var(--ha-box-shadow-l);
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }
    .above .panel {
      top: auto;
      bottom: calc(100% + var(--ha-space-2));
    }
    .end .panel {
      left: auto;
      right: 0;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: var(--ha-font-weight-medium);
    }
    .presets {
      display: flex;
      gap: var(--ha-space-2);
    }
    .sides {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-areas:
        ". top ."
        "left screen right"
        ". bottom .";
      align-items: center;
      gap: var(--ha-space-2);
    }
    .screen {
      grid-area: screen;
      align-self: stretch;
      min-height: 64px;
      border: 2px dashed var(--divider-color);
      border-radius: var(--ha-border-radius-md);
    }
    .top {
      grid-area: top;
    }
    .bottom {
      grid-area: bottom;
    }
    .left {
      grid-area: left;
    }
    .right {
      grid-area: right;
    }
    .highlight {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-debug-safe-area-tool": HaDebugSafeAreaTool;
  }
}
