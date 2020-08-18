import {
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  customElement,
  property,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-vertical-range-input")
class HaVerticalRangeInput extends LitElement {
  @property({ type: Number }) public value!: number;

  @property({ type: Number }) public max = 100;

  @property({ type: Number }) public min = 1;

  @property({ type: Number }) public step = 1;

  protected render(): TemplateResult {
    if (!this.value) {
      return html``;
    }

    return html`
      <input
        type="range"
        .max=${this.max.toString()}
        .min=${this.min.toString()}
        .step=${this.step.toString()}
        .value=${this.value.toString()}
        @change=${this._valueChanged}
      />
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "value-changed", {
      value: (ev.currentTarget as HTMLInputElement).value,
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        height: calc(var(--vertical-range-height, 300px) + 5px);
        width: var(--vertical-range-width, 100px);
        position: relative;
        display: block;
        max-height: none;
      }

      :host input {
        width: var(--vertical-range-height, 300px);
        height: var(--vertical-range-width, 100px);
        margin: 0;
        outline: 0;
        overflow: hidden;
        border: 1px solid var(--divider-color);
        /* background: var(--vertical-range-track-color, #fafafa); */
        border-radius: 8px;
        position: absolute;
        top: calc(50% - var(--vertical-range-width, 100px) / 2);
        right: calc(50% - var(--vertical-range-height, 300px) / 2);
        -webkit-transform: rotate(270deg);
        -moz-transform: rotate(270deg);
        -o-transform: rotate(270deg);
        -ms-transform: rotate(270deg);
        transform: rotate(270deg);
        -webkit-appearance: none;
      }

      :host input::-webkit-slider-runnable-track {
        height: 100%;
        background: var(--vertical-range-track-color, #fafafa);
      }

      :host input::-webkit-slider-thumb {
        -webkit-appearance: none;
        position: relative;
        cursor: grab;
        width: var(--vertical-range-thumb-height, 25px);
        height: var(--vertical-range-thumb-width, 100%);
        background: var(--vertical-range-thumb-color, #fafafa);
        box-shadow: calc(var(--vertical-range-height, 300px) * -1) 0 0
          var(--vertical-range-height, 300px)
          var(--vertical-range-color, var(--state-icon-active-color));
        border-right: 10px solid
          var(
            --vertical-range-thumb-padding-color,
            var(--state-icon-active-color)
          );
        border-left: 10px solid
          var(
            --vertical-range-thumb-padding-color,
            var(--state-icon-active-color)
          );
        border-top: 20px solid
          var(
            --vertical-range-thumb-padding-color,
            var(--state-icon-active-color)
          );
        border-bottom: 20px solid
          var(
            --vertical-range-thumb-padding-color,
            var(--state-icon-active-color)
          );
        transition: box-shadow 0.2s ease-in-out;
      }

      :host input::-webkit-slider-thumb:active {
        cursor: grabbing;
      }

      /* Firefox */
      :host input::-moz-thumb-track {
        height: 100%;
        background-color: var(--vertical-range-track-color, #fafafa);
      }

      :host input::-moz-range-thumb {
        width: 5px;
        height: calc(var(--vertical-range-width, 100px) * 0.4);
        position: relative;
        top: 0px;
        cursor: grab;
        background: var(--vertical-range-track-color, #fafafa);
        box-shadow: -350px 0 0 350px
            var(--vertical-range-color, var(--state-icon-active-color)),
          inset 0 0 0 80px var(--vertical-range-track-color, #fafafa);
        border-right: 9px solid
          var(--vertical-range-color, var(--state-icon-active-color));
        border-left: 9px solid
          var(--vertical-range-color, var(--state-icon-active-color));
        border-top: 22px solid
          var(--vertical-range-color, var(--state-icon-active-color));
        border-bottom: 22px solid
          var(--vertical-range-color, var(--state-icon-active-color));
        border-radius: 0;
        transition: box-shadow 0.2s ease-in-out;
      }

      :host input::-moz-range-thumb:active {
        cursor: grabbing;
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-vertical-range-input": HaVerticalRangeInput;
  }
}
