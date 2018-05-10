import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-slider/paper-slider.js';
import { DomModule } from '@polymer/polymer/lib/elements/dom-module.js';
const $_documentContainer = document.createElement('template');
$_documentContainer.setAttribute('style', 'display: none;');

$_documentContainer.innerHTML = `<dom-module id="ha-paper-slider">
  <template strip-whitespace="">
    <style include="paper-slider">
      .pin > .slider-knob > .slider-knob-inner {
        font-size:  var(--ha-paper-slider-pin-font-size, 10px);
        line-height: normal;
      }

      .pin > .slider-knob > .slider-knob-inner::before {
        top: unset;
        margin-left: unset;

        bottom: calc(15px + var(--calculated-paper-slider-height)/2);
        left: 50%;
        width: 2.6em;
        height: 2.6em;

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
        margin-left: -1.3em;
        width: 2.6em;
        height: 2.4em;

        -webkit-transform-origin: center bottom;
        transform-origin: center bottom;
        -webkit-transform: scale(0) translate(0);
        transform: scale(0) translate(0);
      }

      .pin.expand > .slider-knob > .slider-knob-inner::after {
        -webkit-transform: scale(1) translate(0, -10px);
        transform: scale(1) translate(0, -10px);
      }
    </style>
  </template>

  
</dom-module>`;

document.head.appendChild($_documentContainer.content);

{
  /**
  * @polymer
  * @customElement
  * @appliesMixin paper-slider
  */
  const PaperSliderClass = customElements.get('paper-slider');
  let myTemplate;

  class HaPaperSlider extends PaperSliderClass {
    static get is() { return 'ha-paper-slider'; }

    static get template() {
      if (!myTemplate) {
        // Retrieve this element's dom-module template
        myTemplate = DomModule.import(HaPaperSlider.is, 'template');
        // Clone the contents of the superclass template
        const superTemplateContents = document.importNode(PaperSliderClass.template.content, true);
        // Remove the style from superclass contents, we already included them in our own <style>
        superTemplateContents.querySelector('style').remove();
        // Insert the superclass contents
        myTemplate.content.append(superTemplateContents);
      }
      return myTemplate;
    }
  }
  customElements.define(HaPaperSlider.is, HaPaperSlider);
}
