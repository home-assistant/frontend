import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "./ha-icon";
import "./ha-paper-slider";

class HaLabeledSlider extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          border-radius: 4px;
        }

        .title {
          margin-bottom: 16px;
          opacity: var(--dark-primary-opacity);
        }

        .slider-container {
          display: flex;
        }

        ha-icon {
          margin-top: 4px;
          opacity: var(--dark-secondary-opacity);
        }

        ha-paper-slider {
          flex-grow: 1;
          background-image: var(--ha-slider-background);
        }
      </style>

      <div class="title">[[caption]]</div>
      <div class="extra-container"><slot name="extra"></slot></div>
      <div class="slider-container">
        <ha-icon icon="[[icon]]" hidden$="[[!icon]]"></ha-icon>
        <ha-paper-slider
          min="[[min]]"
          max="[[max]]"
          step="[[step]]"
          pin="[[pin]]"
          disabled="[[disabled]]"
          disabled="[[disabled]]"
          value="{{value}}"
        ></ha-paper-slider>
      </div>
    `;
  }

  static get properties() {
    return {
      caption: String,
      disabled: Boolean,
      min: Number,
      max: Number,
      pin: Boolean,
      step: Number,

      extra: {
        type: Boolean,
        value: false,
      },
      ignoreBarTouch: {
        type: Boolean,
        value: true,
      },
      icon: {
        type: String,
        value: "",
      },
      value: {
        type: Number,
        notify: true,
      },
    };
  }
}

customElements.define("ha-labeled-slider", HaLabeledSlider);
