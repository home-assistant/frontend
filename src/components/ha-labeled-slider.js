import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "./ha-icon";
import "./ha-slider";

class HaLabeledSlider extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
        }

        .title {
          margin: 5px 0 8px;
          color: var(--primary-text-color);
        }

        .slider-container {
          display: flex;
        }

        ha-icon {
          margin-top: 4px;
          color: var(--secondary-text-color);
        }

        ha-slider {
          flex-grow: 1;
          background-image: var(--ha-slider-background);
          border-radius: 4px;
        }
      </style>

      <div class="title">[[_getTitle()]]</div>
      <div class="extra-container"><slot name="extra"></slot></div>
      <div class="slider-container">
        <ha-icon icon="[[icon]]" hidden$="[[!icon]]"></ha-icon>
        <ha-slider
          min="[[min]]"
          max="[[max]]"
          step="[[step]]"
          pin="[[pin]]"
          disabled="[[disabled]]"
          value="{{value}}"
        ></ha-slider>
      </div>
      <template is="dom-if" if="[[helper]]">
        <ha-input-helper-text>[[helper]]</ha-input-helper-text>
      </template>
    `;
  }

  _getTitle() {
    return `${this.caption}${this.caption && this.required ? " *" : ""}`;
  }

  static get properties() {
    return {
      caption: String,
      disabled: Boolean,
      required: Boolean,
      min: Number,
      max: Number,
      pin: Boolean,
      step: Number,
      helper: String,

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
