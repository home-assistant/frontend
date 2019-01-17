import "@polymer/paper-slider";

const PaperSliderClass = customElements.get("paper-slider");
let subTemplate;

class HaSlider extends PaperSliderClass {
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
        `)
      );
    }
    return subTemplate;
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
