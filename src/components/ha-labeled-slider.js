import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-icon/iron-icon.js';
import './ha-paper-slider.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class HaLabeledSlider extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        display: block;
        padding-bottom: 16px;
      }

      .title {
        margin-bottom: 16px;
        opacity: var(--dark-primary-opacity);
      }

      iron-icon {
        float: left;
        margin-top: 4px;
        opacity: var(--dark-secondary-opacity);
      }

      .slider-container {
        margin-left: 24px;
      }

      ha-paper-slider {
        background-image: var(--ha-slider-background);
      }
    </style>

    <div class="title">[[caption]]</div>
    <iron-icon icon="[[icon]]"></iron-icon>
    <div class="slider-container">
      <ha-paper-slider min="[[min]]" max="[[max]]" value="{{value}}" ignore-bar-touch="[[ignoreBarTouch]]">
      </ha-paper-slider>
    </div>
`;
  }

  static get is() { return 'ha-labeled-slider'; }

  static get properties() {
    return {
      caption: String,
      icon: String,
      min: Number,
      max: Number,
      ignoreBarTouch: Boolean,

      value: {
        type: Number,
        notify: true,
      },
    };
  }
}

customElements.define(HaLabeledSlider.is, HaLabeledSlider);
