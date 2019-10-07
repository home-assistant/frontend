import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./ha-paper-slider";
import { EventsMixin } from "../mixins/events-mixin";

/*
 * @appliesMixin EventsMixin
 */
class HaForm extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        .error {
          color: red;
        }
        paper-checkbox {
          display: inline-block;
          padding: 22px 0;
        }
      </style>
      <template is="dom-if" if="[[_isArray(schema)]]" restamp="">
        <template is="dom-if" if="[[error.base]]">
          <div class="error">[[computeError(error.base, schema)]]</div>
        </template>

        <template is="dom-repeat" items="[[schema]]">
          <ha-form
            data="[[_getValue(data, item)]]"
            schema="[[item]]"
            error="[[_getValue(error, item)]]"
            on-data-changed="_valueChanged"
            compute-label="[[computeLabel]]"
            compute-error="[[computeError]]"
          ></ha-form>
        </template>
      </template>
      <template is="dom-if" if="[[!_isArray(schema)]]" restamp="">
        <template is="dom-if" if="[[error]]">
          <div class="error">[[computeError(error, schema)]]</div>
        </template>

        <template
          is="dom-if"
          if='[[_equals(schema.type, "string")]]'
          restamp=""
        >
          <template
            is="dom-if"
            if='[[_includes(schema.name, "password")]]'
            restamp=""
          >
            <paper-input
              type="[[_passwordFieldType(unmaskedPassword)]]"
              label="[[computeLabel(schema)]]"
              value="{{data}}"
              required="[[schema.required]]"
              auto-validate="[[schema.required]]"
              error-message="Required"
            >
              <paper-icon-button
                toggles
                active="{{unmaskedPassword}}"
                slot="suffix"
                icon="[[_passwordFieldIcon(unmaskedPassword)]]"
                id="iconButton"
                title="Click to toggle between masked and clear password"
              >
              </paper-icon-button>
            </paper-input>
          </template>
          <template
            is="dom-if"
            if='[[!_includes(schema.name, "password")]]'
            restamp=""
          >
            <paper-input
              label="[[computeLabel(schema)]]"
              value="{{data}}"
              required="[[schema.required]]"
              auto-validate="[[schema.required]]"
              error-message="Required"
            ></paper-input>
          </template>
        </template>

        <template
          is="dom-if"
          if='[[_equals(schema.type, "integer")]]'
          restamp=""
        >
          <template is="dom-if" if="[[_isRange(schema)]]" restamp="">
            <div>
              [[computeLabel(schema)]]
              <ha-paper-slider
                pin=""
                value="{{data}}"
                min="[[schema.valueMin]]"
                max="[[schema.valueMax]]"
              ></ha-paper-slider>
            </div>
          </template>
          <template is="dom-if" if="[[!_isRange(schema)]]" restamp="">
            <paper-input
              label="[[computeLabel(schema)]]"
              value="{{data}}"
              type="number"
              required="[[schema.required]]"
              auto-validate="[[schema.required]]"
              error-message="Required"
            ></paper-input>
          </template>
        </template>

        <template is="dom-if" if='[[_equals(schema.type, "float")]]' restamp="">
          <!-- TODO -->
          <paper-input
            label="[[computeLabel(schema)]]"
            value="{{data}}"
            required="[[schema.required]]"
            auto-validate="[[schema.required]]"
            error-message="Required"
          ></paper-input>
        </template>

        <template
          is="dom-if"
          if='[[_equals(schema.type, "boolean")]]'
          restamp=""
        >
          <div>
            <paper-checkbox checked="{{data}}"
              >[[computeLabel(schema)]]</paper-checkbox
            >
          </div>
        </template>

        <template
          is="dom-if"
          if='[[_equals(schema.type, "select")]]'
          restamp=""
        >
          <paper-dropdown-menu label="[[computeLabel(schema)]]">
            <paper-listbox
              slot="dropdown-content"
              attr-for-selected="item-name"
              selected="{{data}}"
            >
              <template is="dom-repeat" items="[[schema.options]]">
                <paper-item item-name$="[[_optionValue(item)]]"
                  >[[_optionLabel(item)]]</paper-item
                >
              </template>
            </paper-listbox>
          </paper-dropdown-menu>
        </template>

        <template
          is="dom-if"
          if='[[_equals(schema.type, "positive_time_period_dict")]]'
          restamp=""
        >
          <paper-time-input
            label="[[computeLabel(schema)]]"
            required="[[schema.required]]"
            auto-validate="[[schema.required]]"
            error-message="Required"
            enable-second
            format="24"
            hour$="[[_parseDuration(data, 'hours')]]"
            min$="[[_parseDuration(data, 'minutes')]]"
            sec$="[[_parseDuration(data, 'seconds')]]"
            on-hour-changed="_hourChanged"
            on-min-changed="_minChanged"
            on-sec-changed="_secChanged"
            float-input-labels
            no-hours-limit
            always-float-input-labels
            hour-label="hh"
            min-label="mm"
            sec-label="ss"
          ></paper-time-input>
        </template>
      </template>
    `;
  }

  static get properties() {
    return {
      data: {
        type: Object,
        notify: true,
      },
      schema: Object,
      error: Object,

      // A function that will computes the label to be displayed for a given
      // schema object.
      computeLabel: {
        type: Function,
        value: () => (schema) => schema && schema.name,
      },

      // A function that will computes an error message to be displayed for a
      // given error ID, and relevant schema object
      computeError: {
        type: Function,
        value: () => (error, schema) => error, // eslint-disable-line no-unused-vars
      },
    };
  }

  focus() {
    const input = this.shadowRoot.querySelector(
      "ha-form, paper-input, ha-paper-slider, paper-checkbox, paper-dropdown-menu"
    );

    if (!input) {
      return;
    }

    input.focus();
  }

  _isArray(val) {
    return Array.isArray(val);
  }

  _isRange(schema) {
    return "valueMin" in schema && "valueMax" in schema;
  }

  _equals(a, b) {
    return a === b;
  }

  _includes(a, b) {
    return a.indexOf(b) >= 0;
  }

  _getValue(obj, item) {
    if (obj) {
      return obj[item.name];
    }
    return null;
  }

  _valueChanged(ev) {
    let value = ev.detail.value;
    if (ev.model.item.type === "integer") {
      value = Number(ev.detail.value);
    }
    this.set(["data", ev.model.item.name], value);
  }

  _hourChanged(ev) {
    this._durationChanged(ev, "hours");
  }

  _minChanged(ev) {
    this._durationChanged(ev, "minutes");
  }

  _secChanged(ev) {
    this._durationChanged(ev, "seconds");
  }

  _durationChanged(ev, unit) {
    let value = parseInt(ev.detail.value);

    if (value === this.data[unit]) {
      return;
    }

    if (unit === "seconds" && value > 59) {
      this.set(
        "data.minutes",
        (this.data.minutes || 0) + Math.floor(value / 60)
      );
      value %= 60;
    }

    if (unit === "minutes" && value > 59) {
      this.set("data.hours", (this.data.hours || 0) + Math.floor(value / 60));
      value %= 60;
    }

    if (!value) {
      delete this.data[unit];
      this.notifyPath(["data", unit]);
    } else {
      this.set(["data", unit], value);
    }
  }

  _parseDuration(duration, unit) {
    let value;
    if (unit === "hours" && duration.days) {
      value = (duration.hours || 0) + 24 * duration.days;
      delete duration.days;
    } else {
      value = duration[unit] || 0;
    }
    return value.toString().padStart(2, "0");
  }

  _passwordFieldType(unmaskedPassword) {
    return unmaskedPassword ? "text" : "password";
  }

  _passwordFieldIcon(unmaskedPassword) {
    return unmaskedPassword ? "hass:eye-off" : "hass:eye";
  }

  _optionValue(item) {
    return Array.isArray(item) ? item[0] : item;
  }

  _optionLabel(item) {
    return Array.isArray(item) ? item[1] : item;
  }
}

customElements.define("ha-form", HaForm);
