/**
Adapted from paper-time-input from
https://github.com/ryanburns23/paper-time-input
MIT Licensed. Copyright (c) 2017 Ryan Burns

`<paper-time-input>` Polymer element to accept a time with paper-input & paper-dropdown-menu
Inspired by the time input in google forms

### Styling

`<paper-time-input>` provides the following custom properties and mixins for styling:

Custom property | Description | Default
----------------|-------------|----------
`--paper-time-input-dropdown-ripple-color` | dropdown ripple color | `--primary-color`
`--paper-time-input-cotnainer` | Mixin applied to the inputs | `{}`
`--paper-time-dropdown-input-cotnainer` | Mixin applied to the dropdown input | `{}`
*/
import "@polymer/paper-input/paper-input";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

export class PaperTimeInput extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          @apply --paper-font-common-base;
        }

        paper-input {
          width: 30px;
          text-align: center;
          --paper-input-container-input: {
            /* Damn you firefox
             * Needed to hide spin num in firefox
             * http://stackoverflow.com/questions/3790935/can-i-hide-the-html5-number-input-s-spin-box
             */
            -moz-appearance: textfield;
            @apply --paper-time-input-cotnainer;
          }
          --paper-input-container-input-webkit-spinner: {
            -webkit-appearance: none;
            margin: 0;
            display: none;
          }
          --paper-input-container-shared-input-style_-_-webkit-appearance: textfield;
        }

        paper-dropdown-menu {
          width: 55px;
          padding: 0;
          /* Force ripple to use the whole container */
          --paper-dropdown-menu-ripple: {
            color: var(
              --paper-time-input-dropdown-ripple-color,
              var(--primary-color)
            );
          }
          --paper-input-container-input: {
            @apply --paper-font-button;
            text-align: center;
            padding-left: 5px;
            @apply --paper-time-dropdown-input-cotnainer;
          }
          --paper-input-container-underline: {
            border-color: transparent;
          }
          --paper-input-container-underline-focus: {
            border-color: transparent;
          }
        }

        paper-item {
          cursor: pointer;
          text-align: center;
          font-size: 14px;
        }

        paper-listbox {
          padding: 0;
        }

        label {
          @apply --paper-font-caption;
          color: var(
            --paper-input-container-color,
            var(--secondary-text-color)
          );
        }

        .time-input-wrap {
          @apply --layout-horizontal;
          @apply --layout-no-wrap;
        }

        [hidden] {
          display: none !important;
        }
      </style>

      <label hidden$="[[hideLabel]]">[[label]]</label>
      <div class="time-input-wrap">
        <!-- Hour Input -->
        <paper-input
          id="hour"
          type="number"
          value="{{hour}}"
          label="[[hourLabel]]"
          on-change="_shouldFormatHour"
          required
          prevent-invalid-input
          auto-validate="[[autoValidate]]"
          maxlength="2"
          max="[[_computeHourMax(format)]]"
          min="0"
          no-label-float$="[[!floatInputLabels]]"
          always-float-label$="[[alwaysFloatInputLabels]]"
          disabled="[[disabled]]"
        >
          <span suffix="" slot="suffix">:</span>
        </paper-input>

        <!-- Min Input -->
        <paper-input
          id="min"
          type="number"
          value="{{min}}"
          label="[[minLabel]]"
          on-change="_formatMin"
          required
          auto-validate="[[autoValidate]]"
          prevent-invalid-input
          maxlength="2"
          max="59"
          min="0"
          no-label-float$="[[!floatInputLabels]]"
          always-float-label$="[[alwaysFloatInputLabels]]"
          disabled="[[disabled]]"
        >
          <span hidden$="[[!enableSecond]]" suffix slot="suffix">:</span>
        </paper-input>

        <!-- Sec Input -->
        <paper-input
          id="sec"
          type="number"
          value="{{sec}}"
          label="[[secLabel]]"
          on-change="_formatSec"
          required
          auto-validate="[[autoValidate]]"
          prevent-invalid-input
          maxlength="2"
          max="59"
          min="0"
          no-label-float$="[[!floatInputLabels]]"
          always-float-label$="[[alwaysFloatInputLabels]]"
          disabled="[[disabled]]"
          hidden$="[[!enableSecond]]"
        >
        </paper-input>

        <!-- Dropdown Menu -->
        <paper-dropdown-menu
          id="dropdown"
          required=""
          hidden$="[[_equal(format, 24)]]"
          no-label-float=""
          disabled="[[disabled]]"
        >
          <paper-listbox
            attr-for-selected="name"
            selected="{{amPm}}"
            slot="dropdown-content"
          >
            <paper-item name="AM">AM</paper-item>
            <paper-item name="PM">PM</paper-item>
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
    `;
  }

  static get properties() {
    return {
      /**
       * Label for the input
       */
      label: {
        type: String,
        value: "Time",
      },
      /**
       * auto validate time inputs
       */
      autoValidate: {
        type: Boolean,
        value: true,
      },
      /**
       * hides the label
       */
      hideLabel: {
        type: Boolean,
        value: false,
      },
      /**
       * float the input labels
       */
      floatInputLabels: {
        type: Boolean,
        value: false,
      },
      /**
       * always float the input labels
       */
      alwaysFloatInputLabels: {
        type: Boolean,
        value: false,
      },
      /**
       * 12 or 24 hr format
       */
      format: {
        type: Number,
        value: 12,
      },
      /**
       * disables the inputs
       */
      disabled: {
        type: Boolean,
        value: false,
      },
      /**
       * hour
       */
      hour: {
        type: String,
        notify: true,
      },
      /**
       * minute
       */
      min: {
        type: String,
        notify: true,
      },
      /**
       * second
       */
      sec: {
        type: String,
        notify: true,
      },
      /**
       * Suffix for the hour input
       */
      hourLabel: {
        type: String,
        value: "",
      },
      /**
       * Suffix for the min input
       */
      minLabel: {
        type: String,
        value: ":",
      },
      /**
       * Suffix for the sec input
       */
      secLabel: {
        type: String,
        value: "",
      },
      /**
       * show the sec field
       */
      enableSecond: {
        type: Boolean,
        value: false,
      },
      /**
       * limit hours input
       */
      noHoursLimit: {
        type: Boolean,
        value: false,
      },
      /**
       * AM or PM
       */
      amPm: {
        type: String,
        notify: true,
        value: "AM",
      },
      /**
       * Formatted time string
       */
      value: {
        type: String,
        notify: true,
        readOnly: true,
        computed: "_computeTime(min, hour, sec, amPm)",
      },
    };
  }

  /**
   * Validate the inputs
   * @return {boolean}
   */
  validate() {
    var valid = true;
    // Validate hour & min fields
    if (!this.$.hour.validate() | !this.$.min.validate()) {
      valid = false;
    }
    // Validate second field
    if (this.enableSecond && !this.$.sec.validate()) {
      valid = false;
    }
    // Validate AM PM if 12 hour time
    if (this.format === 12 && !this.$.dropdown.validate()) {
      valid = false;
    }
    return valid;
  }

  /**
   * Create time string
   */
  _computeTime(min, hour, sec, amPm) {
    let str;
    if (hour || min || (sec && this.enableSecond)) {
      hour = hour || "00";
      min = min || "00";
      sec = sec || "00";
      str = hour + ":" + min;
      // add sec field
      if (this.enableSecond && sec) {
        str = str + ":" + sec;
      }
      // No ampm on 24 hr time
      if (this.format === 12) {
        str = str + " " + amPm;
      }
    }

    return str;
  }

  /**
   * Format sec
   */
  _formatSec() {
    if (this.sec.toString().length === 1) {
      this.sec = this.sec.toString().padStart(2, "0");
    }
  }

  /**
   * Format min
   */
  _formatMin() {
    if (this.min.toString().length === 1) {
      this.min = this.min.toString().padStart(2, "0");
    }
  }

  /**
   * Format hour
   */
  _shouldFormatHour() {
    if (this.format === 24 && this.hour.toString().length === 1) {
      this.hour = this.hour.toString().padStart(2, "0");
    }
  }

  /**
   * 24 hour format has a max hr of 23
   */
  _computeHourMax(format) {
    if (this.noHoursLimit) {
      return null;
    }
    if (format === 12) {
      return format;
    }
    return 23;
  }

  _equal(n1, n2) {
    return n1 === n2;
  }
}

customElements.define("paper-time-input", PaperTimeInput);
