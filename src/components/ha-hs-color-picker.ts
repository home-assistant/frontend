import iro from "@jaames/iro";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { throttle } from "../common/util/throttle";

@customElement("ha-hs-color-picker")
class HaHsColorPicker extends LitElement {
  @query("#picker") pickerElement?: HTMLElement;

  private picker?: iro.ColorPicker;

  private _throttledFireEvent = throttle(() => {
    fireEvent(this, "value-changed", { value: this.value });
  }, 0);

  @property() value?: { h: number; s: number };

  @property({ type: Number }) throttle?: number;

  private moving = false;

  private _handleInputChange = (color: iro.Color) => {
    const { h, s } = color.hsv;
    this.value = { h, s } as { h: number; s: number };
    this._throttledFireEvent();
  };

  private _handleInputStart = () => {
    this.moving = true;
  };

  private _handleInputEnd = () => {
    this.moving = false;
  };

  protected firstUpdated(): void {
    this.picker = iro.ColorPicker(this.pickerElement!, {
      width: 320,
      layout: [
        {
          component: iro.ui.Wheel,
        },
      ],
    });
    this.picker.on("input:change", this._handleInputChange);
    this.picker.on("input:start", this._handleInputStart);
    this.picker.on("input:end", this._handleInputEnd);
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("throttle")) {
      this._throttledFireEvent?.cancel();
      this._throttledFireEvent = throttle(() => {
        fireEvent(this, "value-changed", { value: this.value });
      }, this.throttle ?? 0);
    }

    if (changedProps.has("value")) {
      if (this.value && this.picker && !this.moving) {
        if (
          this.picker.color.hsv.h !== this.value.h ||
          this.picker.color.hsv.s !== this.value.s
        ) {
          this.picker!.color.hsv = {
            h: this.value.h,
            s: this.value.s,
          };
        }
      }
    }
  }

  protected render(): TemplateResult {
    return html`<div id="picker"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-hs-color-picker": HaHsColorPicker;
  }
}
