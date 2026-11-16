import type { ContextType } from "@lit/context";
import {
  mdiChevronDown,
  mdiChevronLeft,
  mdiChevronRight,
  mdiChevronUp,
  mdiMinus,
  mdiPlus,
  mdiStarFourPointsOutline,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-control-select-menu";
import "../../../../components/ha-control-slider";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import {
  PTZ_DIRECTIONS,
  type CameraPtzEntities,
  type PtzDirection,
} from "../../../../data/camera-controls";
import {
  apiContext,
  formattersContext,
  statesContext,
} from "../../../../data/context";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import { forwardHaptic } from "../../../../data/haptics";
import { setSelectOption } from "../../../../data/select";
import { cameraControlHintStyle } from "./camera-control-styles";

const DIRECTION_ICONS: Record<PtzDirection, string> = {
  up: mdiChevronUp,
  right: mdiChevronRight,
  down: mdiChevronDown,
  left: mdiChevronLeft,
};

type PtzPress = PtzDirection | "zoom_in" | "zoom_out";

/**
 * Pans, tilts and zooms a camera with its PTZ entities. Moving starts while a
 * direction is pressed and stops when it is released.
 */
@customElement("ha-more-info-camera-ptz")
export class HaMoreInfoCameraPtz extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @property({ attribute: false }) public ptz?: CameraPtzEntities;

  @property({ attribute: false }) public deviceId?: string;

  @state() private _pressed?: PtzPress;

  public disconnectedCallback() {
    super.disconnectedCallback();
    // Never leave the camera moving
    this._release();
  }

  protected render() {
    const ptz = this.ptz;
    if (!ptz) {
      return nothing;
    }
    const zoom = ptz.zoom ? this._states[ptz.zoom] : undefined;
    const preset = ptz.preset ? this._states[ptz.preset] : undefined;
    const hint = this._hint();

    return html`
      <div class="ptz">
        <div class="pad">
          ${ptz.move ? this._renderMove() : nothing}
          ${
            ptz.zoom
              ? this._renderZoomSlider(zoom)
              : ptz.zoomIn
                ? this._renderZoomButtons()
                : nothing
          }
        </div>
        ${hint ? html`<div class="hint">${hint}</div>` : nothing}
        ${
          ptz.preset
            ? html`
                <ha-control-select-menu
                  .label=${this._localize(
                    "ui.dialogs.more_info_control.camera.ptz.preset"
                  )}
                  .value=${preset?.state}
                  .disabled=${!preset || preset.state === UNAVAILABLE}
                  .options=${this._presetOptions(preset)}
                  @wa-select=${this._presetSelected}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiStarFourPointsOutline}
                  ></ha-svg-icon>
                </ha-control-select-menu>
              `
            : nothing
        }
      </div>
    `;
  }

  private _presetOptions(preset?: HassEntity) {
    const options = (preset?.attributes.options as string[] | undefined) ?? [];
    return options.map((option) => ({
      value: option,
      label: this._formatters.formatEntityState(preset!, option),
    }));
  }

  private _isUsable(entityId?: string): boolean {
    const stateObj = entityId ? this._states[entityId] : undefined;
    return Boolean(stateObj && stateObj.state !== UNAVAILABLE);
  }

  private _moveUsable(): boolean {
    const ptz = this.ptz!;
    return (
      this._isUsable(ptz.stop) &&
      PTZ_DIRECTIONS.every((direction) => this._isUsable(ptz.move?.[direction]))
    );
  }

  private _hint() {
    const ptz = this.ptz!;
    if (ptz.disabled.length) {
      return this._localize(
        "ui.dialogs.more_info_control.camera.ptz.disabled_entities",
        {
          device_settings: this.deviceId
            ? html`<a href=${`/config/devices/device/${this.deviceId}`}
                >${this._localize(
                  "ui.dialogs.more_info_control.camera.ptz.device_settings"
                )}</a
              >`
            : this._localize(
                "ui.dialogs.more_info_control.camera.ptz.device_settings"
              ),
        }
      );
    }
    if (ptz.move && !this._moveUsable()) {
      return this._localize(
        "ui.dialogs.more_info_control.camera.ptz.unavailable"
      );
    }
    return undefined;
  }

  private _renderMove() {
    const disabled = !this._moveUsable();
    return html`
      <div
        class=${classMap({ dpad: true, disabled })}
        role="group"
        aria-label=${this._localize(
          "ui.dialogs.more_info_control.camera.ptz.move"
        )}
      >
        ${PTZ_DIRECTIONS.map(
          (direction) => html`
            <button
              type="button"
              class=${classMap({
                sector: true,
                [direction]: true,
                pressed: this._pressed === direction,
              })}
              data-press=${direction}
              aria-label=${this._localize(
                `ui.dialogs.more_info_control.camera.ptz.${direction}`
              )}
              .disabled=${disabled}
              @pointerdown=${this._pointerDown}
              @pointerup=${this._release}
              @pointercancel=${this._release}
              @lostpointercapture=${this._release}
              @keydown=${this._keyDown}
              @keyup=${this._keyUp}
              @blur=${this._release}
              @contextmenu=${this._preventContextMenu}
            >
              <ha-svg-icon .path=${DIRECTION_ICONS[direction]}></ha-svg-icon>
            </button>
          `
        )}
        <div class="center"></div>
      </div>
    `;
  }

  private _renderZoomSlider(zoom?: HassEntity) {
    const disabled = !zoom || zoom.state === UNAVAILABLE;
    const min = Number(zoom?.attributes.min ?? 0);
    const max = Number(zoom?.attributes.max ?? 100);
    const step = Number(zoom?.attributes.step ?? 1);
    const value = Number(zoom?.state);
    const label = this._localize(
      "ui.dialogs.more_info_control.camera.ptz.zoom"
    );
    return html`
      <div class="zoom">
        <ha-icon-button
          .label=${this._localize(
            "ui.dialogs.more_info_control.camera.ptz.zoom_in"
          )}
          .path=${mdiPlus}
          .disabled=${disabled || value >= max}
          data-direction="1"
          @click=${this._stepZoom}
        ></ha-icon-button>
        <ha-control-slider
          vertical
          show-handle
          .label=${label}
          .disabled=${disabled}
          .min=${min}
          .max=${max}
          .step=${step}
          .value=${Number.isNaN(value) ? undefined : value}
          @value-changed=${this._zoomChanged}
        ></ha-control-slider>
        <ha-icon-button
          .label=${this._localize(
            "ui.dialogs.more_info_control.camera.ptz.zoom_out"
          )}
          .path=${mdiMinus}
          .disabled=${disabled || value <= min}
          data-direction="-1"
          @click=${this._stepZoom}
        ></ha-icon-button>
      </div>
    `;
  }

  private _renderZoomButtons() {
    const ptz = this.ptz!;
    const disabled =
      !this._isUsable(ptz.zoomIn) ||
      !this._isUsable(ptz.zoomOut) ||
      !this._isUsable(ptz.stop);
    return html`
      <div class="zoom">
        ${(["zoom_in", "zoom_out"] as const).map(
          (press) => html`
            <button
              type="button"
              class=${classMap({
                "zoom-button": true,
                pressed: this._pressed === press,
              })}
              data-press=${press}
              aria-label=${this._localize(
                `ui.dialogs.more_info_control.camera.ptz.${press}`
              )}
              .disabled=${disabled}
              @pointerdown=${this._pointerDown}
              @pointerup=${this._release}
              @pointercancel=${this._release}
              @lostpointercapture=${this._release}
              @keydown=${this._keyDown}
              @keyup=${this._keyUp}
              @blur=${this._release}
              @contextmenu=${this._preventContextMenu}
            >
              <ha-svg-icon
                .path=${press === "zoom_in" ? mdiPlus : mdiMinus}
              ></ha-svg-icon>
            </button>
          `
        )}
      </div>
    `;
  }

  private _entityForPress(press: PtzPress): string | undefined {
    const ptz = this.ptz!;
    if (press === "zoom_in") {
      return ptz.zoomIn;
    }
    if (press === "zoom_out") {
      return ptz.zoomOut;
    }
    return ptz.move?.[press];
  }

  private _pressButton(entityId: string) {
    this._api.callService("button", "press", { entity_id: entityId });
  }

  private _press(press: PtzPress) {
    const entityId = this._entityForPress(press);
    if (!entityId || this._pressed) {
      return;
    }
    this._pressed = press;
    forwardHaptic(this, "light");
    this._pressButton(entityId);
  }

  private _release = () => {
    if (!this._pressed) {
      return;
    }
    this._pressed = undefined;
    if (this.ptz?.stop) {
      this._pressButton(this.ptz.stop);
    }
  };

  private _pointerDown(
    ev: PointerEvent & HASSDomCurrentTargetEvent<HTMLButtonElement>
  ) {
    if (ev.pointerType === "mouse" && ev.button !== 0) {
      return;
    }
    // Keeps the release on this button, also when the pointer leaves it
    ev.currentTarget.setPointerCapture(ev.pointerId);
    this._press(ev.currentTarget.dataset.press as PtzPress);
  }

  private _keyDown(
    ev: KeyboardEvent & HASSDomCurrentTargetEvent<HTMLButtonElement>
  ) {
    if ((ev.key === "Enter" || ev.key === " ") && !ev.repeat) {
      ev.preventDefault();
      this._press(ev.currentTarget.dataset.press as PtzPress);
    }
  }

  private _keyUp(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._release();
    }
  }

  private _preventContextMenu(ev: Event) {
    // A long press on touch screens would open the context menu
    ev.preventDefault();
  }

  private _setZoom(value: number) {
    this._api.callService("number", "set_value", {
      entity_id: this.ptz!.zoom!,
      value,
    });
  }

  private _zoomChanged(ev: HASSDomEvent<{ value?: number }>) {
    if (ev.detail.value !== undefined) {
      this._setZoom(ev.detail.value);
    }
  }

  private _stepZoom(ev: HASSDomCurrentTargetEvent<HTMLElement>) {
    const zoom = this._states[this.ptz!.zoom!];
    if (!zoom) {
      return;
    }
    const min = Number(zoom.attributes.min ?? 0);
    const max = Number(zoom.attributes.max ?? 100);
    const step = Number(zoom.attributes.step ?? 1);
    // A tenth of the range per press, on the steps of the entity
    const increment = Math.max(
      step,
      Math.round((max - min) / 10 / step) * step
    );
    const direction = Number(ev.currentTarget.dataset.direction);
    const value = Number(zoom.state) + direction * increment;
    this._setZoom(Math.min(max, Math.max(min, value)));
  }

  private _presetSelected(ev: HaDropdownSelectEvent) {
    const option = ev.detail.item.value;
    const preset = this._states[this.ptz!.preset!];
    if (!option || !preset || option === preset.state) {
      return;
    }
    setSelectOption(this._api.callService, preset.entity_id, option);
  }

  static styles = [
    cameraControlHintStyle,
    css`
      :host {
        display: block;
      }

      /* As wide as the pad, the note and presets below line up with it */
      .ptz {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-6);
        width: fit-content;
        margin: 0 auto;
      }

      .ptz > .hint,
      ha-control-select-menu {
        display: block;
        box-sizing: border-box;
        width: 0;
        min-width: 100%;
        max-width: none;
      }

      .pad {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ha-space-8);
      }

      .dpad {
        --dpad-size: 200px;
        position: relative;
        width: var(--dpad-size);
        height: var(--dpad-size);
        border-radius: var(--ha-border-radius-circle);
        overflow: hidden;
        background-color: var(--ha-color-fill-neutral-quiet-resting);
        touch-action: none;
      }

      /* Each direction fills the quarter of the circle towards its side */
      .sector {
        position: absolute;
        inset: 0;
        display: flex;
        padding: var(--ha-space-4);
        margin: 0;
        border: none;
        background-color: transparent;
        color: var(--primary-text-color);
        cursor: pointer;
        transition: background-color var(--ha-animation-duration-fast, 150ms)
          ease-in-out;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        -webkit-user-select: none;
      }

      .sector:focus {
        outline: none;
      }

      .sector.up {
        clip-path: polygon(0 0, 100% 0, 50% 50%);
        align-items: flex-start;
        justify-content: center;
      }

      .sector.right {
        clip-path: polygon(100% 0, 100% 100%, 50% 50%);
        align-items: center;
        justify-content: flex-end;
      }

      .sector.down {
        clip-path: polygon(0 100%, 100% 100%, 50% 50%);
        align-items: flex-end;
        justify-content: center;
      }

      .sector.left {
        clip-path: polygon(0 0, 0 100%, 50% 50%);
        align-items: center;
        justify-content: flex-start;
      }

      @media (hover: hover) {
        .sector:hover:not(:disabled) {
          background-color: var(--ha-color-fill-neutral-quiet-hover);
        }
      }

      .sector:focus-visible {
        background-color: var(--ha-color-fill-neutral-normal-resting);
      }

      .sector.pressed {
        background-color: var(--ha-color-fill-primary-normal-active);
        color: var(--ha-color-on-primary-normal);
      }

      .sector:disabled,
      .zoom-button:disabled {
        cursor: not-allowed;
        color: var(--disabled-text-color);
      }

      .center {
        position: absolute;
        inset: 30%;
        border-radius: var(--ha-border-radius-circle);
        background-color: var(--card-background-color);
        box-shadow: 0 0 0 1px var(--divider-color);
        pointer-events: none;
      }

      .zoom {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--ha-space-1);
      }

      ha-control-slider {
        height: 120px;
        --control-slider-thickness: 40px;
        --control-slider-border-radius: var(--ha-border-radius-pill);
        --control-slider-color: var(--primary-color);
      }

      .zoom-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        padding: 0;
        border: none;
        border-radius: var(--ha-border-radius-circle);
        background-color: var(--ha-color-fill-neutral-quiet-resting);
        color: var(--primary-text-color);
        cursor: pointer;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .zoom-button.pressed {
        background-color: var(--ha-color-fill-primary-normal-active);
        color: var(--ha-color-on-primary-normal);
      }

      .zoom-button:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        .sector {
          transition: none;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-camera-ptz": HaMoreInfoCameraPtz;
  }
}
