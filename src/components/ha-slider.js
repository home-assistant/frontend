import "@polymer/paper-slider";

const PaperSliderClass = customElements.get("paper-slider");
let subTemplate;

export class HaSlider extends PaperSliderClass {
  static get template() {
    if (!subTemplate) {
      subTemplate = PaperSliderClass.template.cloneNode(true);

      const superStyle = subTemplate.content.querySelector("style");

      // append style to add mirroring of pin in RTL
      superStyle.appendChild(
        document.createTextNode(`
          :host([dir="rtl"]) #sliderContainer.pin.expand > .slider-knob > .slider-knob-inner::after {
            -webkit-transform: scale(1) translate(0, -17px) scaleX(-1) !important;
            transform: scale(1) translate(0, -17px) scaleX(-1) !important;
            }

            .pin > .slider-knob > .slider-knob-inner {
              font-size:  var(--ha-slider-pin-font-size, 15px);
              line-height: normal;
              cursor: pointer;
            }

            .disabled.ring > .slider-knob > .slider-knob-inner {
              background-color: var(--paper-slider-disabled-knob-color, var(--disabled-text-color));
              border: 2px solid var(--paper-slider-disabled-knob-color, var(--disabled-text-color));
            }

            .pin > .slider-knob > .slider-knob-inner::before {
              top: unset;
              margin-left: unset;

              bottom: calc(15px + var(--calculated-paper-slider-height)/2);
              left: 50%;
              width: 2.2em;
              height: 2.2em;

              -webkit-transform-origin: left bottom;
              transform-origin: left bottom;
              -webkit-transform: rotate(-45deg) scale(0) translate(0);
              transform: rotate(-45deg) scale(0) translate(0);
            }

            .pin.expand > .slider-knob > .slider-knob-inner::before {
              -webkit-transform: rotate(-45deg) scale(1) translate(7px, -7px);
              transform: rotate(-45deg) scale(1) translate(7px, -7px);
            }

            .pin > .slider-knob > .slider-knob-inner::after {
              top: unset;
              font-size: unset;

              bottom: calc(15px + var(--calculated-paper-slider-height)/2);
              left: 50%;
              margin-left: -1.1em;
              width: 2.2em;
              height: 2.1em;

              -webkit-transform-origin: center bottom;
              transform-origin: center bottom;
              -webkit-transform: scale(0) translate(0);
              transform: scale(0) translate(0);
            }

            .pin.expand > .slider-knob > .slider-knob-inner::after {
              -webkit-transform: scale(1) translate(0, -10px);
              transform: scale(1) translate(0, -10px);
            }

            .slider-input {
              width: 54px;
            }
        `)
      );
    }
    return subTemplate;
  }

  _setImmediateValue(newImmediateValue) {
    super._setImmediateValue(
      this.step >= 1
        ? Math.round(newImmediateValue)
        : Math.round(newImmediateValue * 100) / 100
    );
  }

  _calcStep(value) {
    if (!this.step) {
      return parseFloat(value);
    }

    const numSteps = Math.round((value - this.min) / this.step);
    const stepStr = this.step.toString();
    const stepPointAt = stepStr.indexOf(".");
    if (stepPointAt !== -1) {
      /**
       * For small values of this.step, if we calculate the step using
       * For non-integer values of this.step, if we calculate the step using
       * `Math.round(value / step) * step` we may hit a precision point issue
       * eg. 0.1 * 0.2 =  0.020000000000000004
       * http://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html
       *
       * as a work around we can round with the decimal precision of `step`
       */
      const precision = 10 ** (stepStr.length - stepPointAt - 1);
      return (
        Math.round((numSteps * this.step + this.min) * precision) / precision
      );
    }

    return numSteps * this.step + this.min;
  }
}
customElements.define("ha-slider", HaSlider);
