import { mdiDelete, mdiPlus, mdiRefresh } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from "lit/decorators";
import { live } from "lit/directives/live";
import { ensureArray } from "../../common/array/ensure-array";
import { consume } from "../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { formatNumber } from "../../common/number/format_number";
import { fetchThumbnailUrl } from "../../data/camera";
import {
  apiContext,
  connectionContext,
  internationalizationContext,
} from "../../data/context";
import type { ImageRegionPoint } from "../../data/image_region";
import {
  IMAGE_REGION_MIN_POINTS,
  insertMidpoint,
  isImageRegion,
  movePoints,
  regionFromPoints,
  roundPercent,
  roundPoint,
} from "../../data/image_region";
import type { ImageRegionSelector } from "../../data/selector";
import type {
  HomeAssistantApi,
  HomeAssistantConnection,
  HomeAssistantInternationalization,
} from "../../types";
import "../ha-alert";
import "../ha-button";
import type { HaButton } from "../ha-button";
import "../ha-icon-button";
import "../ha-input-helper-text";
import "../ha-svg-icon";
import "../input/ha-input";

// Keyboard step (percent) for moving a corner, and with shift held.
const KEY_STEP = 1;
const KEY_STEP_LARGE = 10;

// A drawn region smaller than this (percent per side) counts as a click.
const MIN_DRAW_SIZE = 1;

// The region "Add region" creates, in percent of the image.
const DEFAULT_REGION_START = { x: 25, y: 25 };
const DEFAULT_REGION_END = { x: 75, y: 75 };

type IndexedElement = HTMLElement & { index: number };

type FocusKind = "corner" | "remove" | "add-region";

type Drag =
  | { kind: "draw"; pointerId: number; start: ImageRegionPoint }
  | { kind: "corner"; pointerId: number; index: number }
  | {
      kind: "region";
      pointerId: number;
      start: ImageRegionPoint;
      points: ImageRegionPoint[];
    };

/**
 * Draws a region on the image of a camera, as polygon corners in percent of
 * the image. Dragging on an empty image draws a rectangle; corners can then
 * be moved, added on an edge, or removed, and the corners can also be typed.
 */
@customElement("ha-selector-image_region")
export class HaImageRegionSelector extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: HomeAssistantConnection;

  @property({ attribute: false }) public selector!: ImageRegionSelector;

  @property({ attribute: false }) public value?: ImageRegionPoint[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    filter_entity?: string | string[];
  };

  @state() private _imageUrl?: string;

  @state() private _imageFailed = false;

  @state() private _aspectRatio = 16 / 9;

  // The corners while a drag is in progress, before they are committed.
  @state() private _draft?: ImageRegionPoint[];

  // Set when a validity check failed, until the value or config changes.
  @state() private _showValidation = false;

  @query(".frame") private _frame?: HTMLElement;

  @queryAll(".corner") private _corners!: NodeListOf<HTMLElement>;

  @queryAll(".remove") private _removeButtons!: NodeListOf<
    HTMLElement & { disabled: boolean }
  >;

  @query(".add-corner") private _addCornerButton?: HTMLElement;

  @query(".add-region") private _addRegionButton?: HaButton;

  @query(".clear") private _clearButton?: HaButton;

  // What to focus once the parent sent the changed value back.
  private _pendingFocus?: { kind: FocusKind; index: number };

  private _drag?: Drag;

  private _imageEntityId?: string;

  private get _entityId(): string | undefined {
    return (
      this.selector.image_region?.entity_id ??
      ensureArray(this.context?.filter_entity)?.find(
        (entityId) => computeDomain(entityId) === "camera"
      )
    );
  }

  private get _minPoints(): number {
    return this.selector.image_region?.min_points ?? IMAGE_REGION_MIN_POINTS;
  }

  private get _maxPoints(): number {
    return this.selector.image_region?.max_points ?? Infinity;
  }

  // The committed corners, or none when the value can't be shown.
  private get _points(): ImageRegionPoint[] {
    return isImageRegion(this.value) ? this.value : [];
  }

  private get _invalid(): boolean {
    return this.value != null && !isImageRegion(this.value);
  }

  public reportValidity(): boolean {
    // Like a disabled native input, a disabled selector is always valid.
    const valid = this.disabled || !this._validationErrorKey;
    this._showValidation = !valid;
    return valid;
  }

  public focus(options?: FocusOptions): void {
    const target = this._invalid
      ? this._clearButton
      : this._points.length
        ? this._corners[0]
        : this._addRegionButton;
    if (target) {
      target.focus(options);
    } else {
      super.focus(options);
    }
  }

  // Why the value would be rejected; the invalid value has its own alert.
  private get _validationErrorKey():
    "required" | "min_points" | "max_points" | "invalid" | undefined {
    if (this.value == null) {
      return this.required ? "required" : undefined;
    }
    // An empty list is sent as is and rejected, also for optional fields.
    if (Array.isArray(this.value) && !this.value.length) {
      return "required";
    }
    if (this._invalid) {
      return "invalid";
    }
    const count = this._points.length;
    if (count < this._minPoints) {
      return "min_points";
    }
    return count > this._maxPoints ? "max_points" : undefined;
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._endDrag();
  }

  protected updated(changedProps: PropertyValues<this>): void {
    if (changedProps.has("value") && this._pendingFocus) {
      const { kind, index } = this._pendingFocus;
      this._pendingFocus = undefined;
      this._applyFocus(kind, index);
    }
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (
      changedProps.has("value") ||
      changedProps.has("required") ||
      changedProps.has("disabled") ||
      changedProps.has("selector")
    ) {
      this._showValidation = false;
    }
    if (
      (changedProps.has("selector") || changedProps.has("context")) &&
      this._entityId !== this._imageEntityId
    ) {
      this._imageEntityId = this._entityId;
      this._imageUrl = undefined;
      this._aspectRatio = 16 / 9;
      this._loadImage();
    }
  }

  private async _loadImage(): Promise<void> {
    const entityId = this._imageEntityId;
    this._imageFailed = false;
    if (!entityId) {
      return;
    }
    try {
      const url = await fetchThumbnailUrl(
        { callWS: this._api.callWS, hassUrl: this._connection.hassUrl },
        entityId
      );
      if (entityId === this._imageEntityId) {
        this._imageUrl = url;
      }
    } catch (_err) {
      if (entityId === this._imageEntityId) {
        this._imageUrl = undefined;
        this._imageFailed = true;
      }
    }
  }

  protected render() {
    const localize = this._i18n.localize;
    const points = this._points;
    const shown = this._draft ?? points;
    const editable = !this.disabled && !this._invalid;
    const canAdd = points.length < this._maxPoints;
    const canRemove = points.length > this._minPoints;

    return html`
      ${
        this.label
          ? html`<div class="label">
              ${this.label}${this.required ? "*" : ""}
            </div>`
          : nothing
      }
      ${
        this._invalid
          ? html`<ha-alert alert-type="warning">
              ${localize("ui.components.selectors.image_region.invalid_value")}
            </ha-alert>`
          : nothing
      }
      <div
        class="frame ${editable ? "" : "disabled"}"
        style="aspect-ratio: ${this._aspectRatio}; width: min(100%, calc(60vh * ${this._aspectRatio}))"
        @pointermove=${this._pointerMove}
        @pointerup=${this._pointerUp}
        @pointercancel=${this._pointerCancel}
        @lostpointercapture=${this._pointerCancel}
      >
        ${
          this._imageUrl
            ? html`<img
                src=${this._imageUrl}
                alt=""
                draggable="false"
                @load=${this._imageLoaded}
                @error=${this._imageError}
              />`
            : html`<div class="placeholder">
                ${localize(
                  this._imageFailed
                    ? "ui.components.selectors.image_region.image_failed"
                    : "ui.components.selectors.image_region.no_image"
                )}
              </div>`
        }
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          @pointerdown=${this._pointerDown}
        >
          ${
            shown.length
              ? svg`<polygon
                class="region"
                points=${shown.map((point) => `${point.x},${point.y}`).join(" ")}
              ></polygon>`
              : nothing
          }
        </svg>
        ${shown.map(
          (point, index) => html`
            <div
              class="corner"
              style="left: ${point.x}%; top: ${point.y}%"
              tabindex=${editable ? 0 : -1}
              role="slider"
              aria-disabled=${editable ? "false" : "true"}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow=${
                /* The handle moves in 2D; the value text reads both axes. */
                point.x
              }
              aria-valuetext=${localize(
                "ui.components.selectors.image_region.corner_position",
                {
                  number: index + 1,
                  x: formatNumber(point.x, this._i18n.locale),
                  y: formatNumber(point.y, this._i18n.locale),
                }
              )}
              aria-label=${localize(
                "ui.components.selectors.image_region.corner",
                { number: index + 1 }
              )}
              aria-describedby="corner-help"
              .index=${index}
              @pointerdown=${this._cornerPointerDown}
              @keydown=${this._cornerKeyDown}
            ></div>
            ${
              canAdd
                ? html`<div
                    class="midpoint ${this._draft ? "dragging" : ""}"
                    style=${this._midpointStyle(shown, index)}
                    tabindex=${editable ? 0 : -1}
                    role="button"
                    aria-disabled=${editable ? "false" : "true"}
                    aria-label=${localize(
                      "ui.components.selectors.image_region.add_corner_between",
                      {
                        first: index + 1,
                        second: ((index + 1) % shown.length) + 1,
                      }
                    )}
                    .index=${index}
                    @pointerdown=${this._midpointPointerDown}
                    @keydown=${this._midpointKeyDown}
                    @click=${this._midpointClick}
                  ></div>`
                : nothing
            }
          `
        )}
      </div>
      <span id="corner-help" hidden>
        ${localize("ui.components.selectors.image_region.corner_help")}
      </span>
      <div class="toolbar">
        <span class="hint">
          ${
            this._invalid
              ? nothing
              : localize(
                  points.length
                    ? "ui.components.selectors.image_region.edit_hint"
                    : "ui.components.selectors.image_region.draw_hint"
                )
          }
        </span>
        ${
          this._entityId
            ? html`<ha-icon-button
                .path=${mdiRefresh}
                .label=${localize(
                  "ui.components.selectors.image_region.refresh_image"
                )}
                @click=${this._loadImage}
              ></ha-icon-button>`
            : nothing
        }
      </div>
      ${points.map(
        (point, index) => html`
          <div
            class="row"
            role="group"
            aria-label=${localize(
              "ui.components.selectors.image_region.corner",
              { number: index + 1 }
            )}
          >
            <span class="row-label">
              ${localize("ui.components.selectors.image_region.corner", {
                number: index + 1,
              })}
            </span>
            ${(["x", "y"] as const).map(
              (axis) => html`
                <ha-input
                  type="number"
                  inputmode="decimal"
                  .label=${localize(
                    `ui.components.selectors.image_region.${axis}`
                  )}
                  .value=${live(String(point[axis]))}
                  .min=${0}
                  .max=${100}
                  .step=${0.01}
                  .disabled=${!editable}
                  .index=${index}
                  .axis=${axis}
                  @change=${this._inputChanged}
                >
                  <span slot="end">%</span>
                </ha-input>
              `
            )}
            <ha-icon-button
              class="remove"
              .path=${mdiDelete}
              .label=${localize(
                "ui.components.selectors.image_region.remove_corner",
                { number: index + 1 }
              )}
              .disabled=${!editable || !canRemove}
              .index=${index}
              @click=${this._removeCorner}
            ></ha-icon-button>
          </div>
        `
      )}
      <div class="actions">
        ${
          points.length
            ? html`<ha-button
                  class="add-corner"
                  appearance="plain"
                  .disabled=${!editable || !canAdd}
                  @click=${this._addCorner}
                >
                  <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                  ${localize("ui.components.selectors.image_region.add_corner")}
                </ha-button>
                <ha-button
                  class="clear"
                  appearance="plain"
                  variant="danger"
                  .disabled=${this.disabled}
                  @click=${this._clear}
                >
                  ${localize("ui.components.selectors.image_region.clear")}
                </ha-button>`
            : this._invalid
              ? html`<ha-button
                  class="clear"
                  appearance="plain"
                  variant="danger"
                  .disabled=${this.disabled}
                  @click=${this._clear}
                >
                  ${localize("ui.components.selectors.image_region.clear")}
                </ha-button>`
              : html`<ha-button
                  class="add-region"
                  appearance="plain"
                  .disabled=${!editable}
                  @click=${this._addRegion}
                >
                  <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                  ${localize("ui.components.selectors.image_region.add_region")}
                </ha-button>`
        }
      </div>
      ${this._renderValidationError()}
      ${
        this.helper
          ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
          : nothing
      }
    `;
  }

  private _renderValidationError() {
    const key = this._showValidation ? this._validationErrorKey : undefined;
    if (!key || key === "invalid") {
      return nothing;
    }
    return html`<div class="error" role="alert">
      ${this._i18n.localize(
        `ui.components.selectors.image_region.validation.${key}`,
        { min: this._minPoints, max: this._maxPoints }
      )}
    </div>`;
  }

  private _midpointStyle(points: ImageRegionPoint[], index: number): string {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    return `left: ${(start.x + end.x) / 2}%; top: ${(start.y + end.y) / 2}%`;
  }

  private _imageLoaded(ev: HASSDomCurrentTargetEvent<HTMLImageElement>): void {
    const image = ev.currentTarget;
    if (image.naturalWidth && image.naturalHeight) {
      this._aspectRatio = image.naturalWidth / image.naturalHeight;
    }
  }

  private _imageError(): void {
    this._imageUrl = undefined;
    this._imageFailed = true;
  }

  // The pointer position in percent of the image.
  private _percent(ev: PointerEvent): ImageRegionPoint {
    const rect = this._frame!.getBoundingClientRect();
    return {
      x: roundPercent(((ev.clientX - rect.left) / rect.width) * 100),
      y: roundPercent(((ev.clientY - rect.top) / rect.height) * 100),
    };
  }

  private _canStartDrag(ev: PointerEvent): boolean {
    return (
      !this.disabled &&
      !this._invalid &&
      !this._drag &&
      ev.isPrimary &&
      ev.button === 0
    );
  }

  private _startDrag(ev: PointerEvent, drag: Drag): void {
    ev.preventDefault();
    ev.stopPropagation();
    this._frame!.setPointerCapture(ev.pointerId);
    this._drag = drag;
    window.addEventListener("keydown", this._cancelOnEscape, true);
  }

  private _pointerDown(ev: PointerEvent): void {
    if (!this._canStartDrag(ev)) {
      return;
    }
    const points = this._points;
    if (!points.length) {
      this._startDrag(ev, {
        kind: "draw",
        pointerId: ev.pointerId,
        start: this._percent(ev),
      });
    } else if ((ev.target as Element).classList.contains("region")) {
      this._startDrag(ev, {
        kind: "region",
        pointerId: ev.pointerId,
        start: this._percent(ev),
        points,
      });
    }
  }

  private _cornerPointerDown(
    ev: PointerEvent & HASSDomCurrentTargetEvent<IndexedElement>
  ): void {
    if (!this._canStartDrag(ev)) {
      return;
    }
    const corner = ev.currentTarget;
    this._startDrag(ev, {
      kind: "corner",
      pointerId: ev.pointerId,
      index: corner.index,
    });
    // The pointer default is prevented, so focus the corner for the keyboard.
    corner.focus();
  }

  private _midpointPointerDown(
    ev: PointerEvent & HASSDomCurrentTargetEvent<IndexedElement>
  ): void {
    if (!this._canStartDrag(ev)) {
      return;
    }
    const index = ev.currentTarget.index;
    this._draft = insertMidpoint(this._points, index);
    this._startDrag(ev, {
      kind: "corner",
      pointerId: ev.pointerId,
      index: index + 1,
    });
  }

  private _midpointKeyDown(
    ev: KeyboardEvent & HASSDomCurrentTargetEvent<IndexedElement>
  ): void {
    if (
      (ev.key !== "Enter" && ev.key !== " ") ||
      ev.ctrlKey ||
      ev.metaKey ||
      ev.altKey
    ) {
      return;
    }
    ev.preventDefault();
    this._addCornerAfter(ev.currentTarget.index);
  }

  // Assistive technology activates the button with a click alone. Pointer
  // clicks (detail >= 1) already inserted the corner on pointerdown.
  private _midpointClick(
    ev: MouseEvent & HASSDomCurrentTargetEvent<IndexedElement>
  ): void {
    if (ev.detail === 0) {
      this._addCornerAfter(ev.currentTarget.index);
    }
  }

  private _addCornerAfter(index: number): void {
    if (this.disabled || this._invalid || this._drag) {
      return;
    }
    this._setValue(insertMidpoint(this._points, index), {
      kind: "corner",
      index: index + 1,
    });
  }

  private _pointerMove(ev: PointerEvent): void {
    const drag = this._drag;
    if (!drag || ev.pointerId !== drag.pointerId) {
      return;
    }
    const position = this._percent(ev);
    if (drag.kind === "draw") {
      this._draft = regionFromPoints(
        drag.start,
        position,
        this._minPoints,
        this._maxPoints
      );
    } else if (drag.kind === "region") {
      this._draft = movePoints(
        drag.points,
        position.x - drag.start.x,
        position.y - drag.start.y
      );
    } else {
      const points = [...(this._draft ?? this._points)];
      points[drag.index] = position;
      this._draft = points;
    }
  }

  private _pointerUp(ev: PointerEvent): void {
    const drag = this._drag;
    if (!drag || ev.pointerId !== drag.pointerId) {
      return;
    }
    const draft = this._draft;
    this._endDrag();
    if (!draft) {
      return;
    }
    if (drag.kind === "draw") {
      const xs = draft.map((point) => point.x);
      const ys = draft.map((point) => point.y);
      if (
        Math.max(...xs) - Math.min(...xs) < MIN_DRAW_SIZE ||
        Math.max(...ys) - Math.min(...ys) < MIN_DRAW_SIZE
      ) {
        return;
      }
    }
    this._setValue(draft);
  }

  private _pointerCancel(ev: PointerEvent): void {
    if (this._drag && ev.pointerId === this._drag.pointerId) {
      this._endDrag();
    }
  }

  private _cancelOnEscape = (ev: KeyboardEvent): void => {
    if (ev.key === "Escape" && this._drag) {
      ev.preventDefault();
      ev.stopPropagation();
      this._endDrag();
    }
  };

  private _endDrag(): void {
    if (this._drag && this._frame?.hasPointerCapture(this._drag.pointerId)) {
      this._frame.releasePointerCapture(this._drag.pointerId);
    }
    this._drag = undefined;
    this._draft = undefined;
    window.removeEventListener("keydown", this._cancelOnEscape, true);
  }

  private _cornerKeyDown(
    ev: KeyboardEvent & HASSDomCurrentTargetEvent<IndexedElement>
  ): void {
    if (this.disabled || this._invalid || this._drag) {
      return;
    }
    const index = ev.currentTarget.index;
    const points = [...this._points];
    const step = ev.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (ev.key in moves) {
      const [dx, dy] = moves[ev.key];
      points[index] = roundPoint({
        x: points[index].x + dx,
        y: points[index].y + dy,
      });
      ev.preventDefault();
      this._setValue(points);
    } else if (
      (ev.key === "Delete" || ev.key === "Backspace") &&
      points.length > this._minPoints
    ) {
      ev.preventDefault();
      points.splice(index, 1);
      this._setValue(points, { kind: "corner", index });
    }
  }

  private _inputChanged(
    ev: Event &
      HASSDomCurrentTargetEvent<
        IndexedElement & { value: string; axis: "x" | "y" }
      >
  ): void {
    ev.stopPropagation();
    const input = ev.currentTarget;
    const number = Number(input.value);
    if (input.value === "" || !Number.isFinite(number)) {
      // Show the stored value again.
      this.requestUpdate();
      return;
    }
    const points = [...this._points];
    points[input.index] = roundPoint({
      ...points[input.index],
      [input.axis]: number,
    });
    this._setValue(points);
  }

  private _addRegion(): void {
    this._setValue(
      regionFromPoints(
        DEFAULT_REGION_START,
        DEFAULT_REGION_END,
        this._minPoints,
        this._maxPoints
      ),
      { kind: "corner", index: 0 }
    );
  }

  private _addCorner(): void {
    const points = this._points;
    this._setValue(insertMidpoint(points, points.length - 1));
  }

  private _removeCorner(ev: HASSDomCurrentTargetEvent<IndexedElement>): void {
    const index = ev.currentTarget.index;
    const points = [...this._points];
    points.splice(index, 1);
    this._setValue(points, { kind: "remove", index });
  }

  // Keep the keyboard focus near the element that changed the value.
  private _applyFocus(kind: FocusKind, index: number): void {
    if (kind === "add-region") {
      // The button was just rendered; its inner button exists after its update.
      const button = this._addRegionButton;
      button?.updateComplete.then(() => button.focus());
      return;
    }
    const removeButtons = [...this._removeButtons];
    const corners = [...this._corners];
    const last = (elements: HTMLElement[]) =>
      elements[Math.min(index, elements.length - 1)];
    const target =
      kind === "remove" && removeButtons.some((button) => !button.disabled)
        ? last(removeButtons)
        : last(corners);
    (target ?? this._addCornerButton)?.focus();
  }

  private _clear(): void {
    this._pendingFocus = { kind: "add-region", index: 0 };
    fireEvent(this, "value-changed", { value: undefined });
  }

  private _setValue(
    points: ImageRegionPoint[],
    focus?: { kind: FocusKind; index: number }
  ): void {
    this._pendingFocus = focus;
    fireEvent(this, "value-changed", { value: points });
  }

  static styles = css`
    :host {
      display: block;
      container-type: inline-size;
    }
    .label {
      margin-bottom: var(--ha-space-2);
      color: var(--primary-text-color);
    }
    ha-alert {
      display: block;
      margin-bottom: var(--ha-space-2);
    }
    .frame {
      position: relative;
      margin-inline: auto;
      border-radius: var(--ha-border-radius-md, 8px);
      background-color: var(--secondary-background-color);
      touch-action: none;
      user-select: none;
    }
    .frame.disabled {
      pointer-events: none;
    }
    .frame.disabled img,
    .frame.disabled svg {
      opacity: 0.5;
    }
    img,
    svg,
    .placeholder {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border-radius: inherit;
    }
    img {
      object-fit: fill;
    }
    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--ha-space-4);
      box-sizing: border-box;
      text-align: center;
      color: var(--secondary-text-color);
    }
    svg {
      cursor: crosshair;
    }
    .region {
      fill: var(--primary-color);
      fill-opacity: 0.3;
      stroke: var(--primary-color);
      stroke-width: 2px;
      vector-effect: non-scaling-stroke;
      cursor: move;
    }
    .corner,
    .midpoint {
      position: absolute;
      box-sizing: border-box;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      touch-action: none;
    }
    /* A larger invisible hit area for touch. */
    .corner::before,
    .midpoint::before {
      content: "";
      position: absolute;
      inset: -12px;
      border-radius: 50%;
    }
    .corner {
      /* Above the midpoints, whose hit areas can reach it on short edges. */
      z-index: 1;
      width: 20px;
      height: 20px;
      border: 2px solid var(--primary-color);
      background-color: var(--card-background-color);
      cursor: grab;
    }
    .corner:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
      box-shadow: 0 0 0 5px var(--card-background-color);
    }
    .midpoint:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
      opacity: 1;
    }
    .midpoint {
      width: 14px;
      height: 14px;
      background-color: var(--primary-color);
      opacity: 0.6;
      cursor: copy;
    }
    /* Hidden during drags, but kept so a focused midpoint keeps the focus. */
    .midpoint.dragging {
      opacity: 0;
      pointer-events: none;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      min-height: 48px;
    }
    .hint {
      flex: 1;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ha-space-2);
      margin-bottom: var(--ha-space-2);
    }
    .row-label {
      flex: 0 0 96px;
    }
    .row ha-input {
      flex: 1 1 0;
      min-width: 88px;
    }
    @container (max-width: 360px) {
      .row-label {
        flex-basis: 100%;
      }
    }
    .error {
      margin-top: var(--ha-space-2);
      color: var(--ha-color-on-danger-quiet);
      font-size: var(--ha-font-size-s);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-image_region": HaImageRegionSelector;
  }
}
