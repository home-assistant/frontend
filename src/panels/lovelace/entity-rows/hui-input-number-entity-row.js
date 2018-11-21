import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/paper-input/paper-input";
import { IronResizableBehavior } from "@polymer/iron-resizable-behavior/iron-resizable-behavior";
import { mixinBehaviors } from "@polymer/polymer/lib/legacy/class";

import "../components/hui-generic-entity-row";
import "../../../components/ha-slider";

class HuiInputNumberEntityRow extends mixinBehaviors(
  [IronResizableBehavior],
  PolymerElement
) {
  static get template() {
    return html`
      ${this.styleTemplate}
      <hui-generic-entity-row
        hass="[[hass]]"
        config="[[_config]]"
        id="input_number_card"
      >
        ${this.inputNumberControlTemplate}
      </hui-generic-entity-row>
    `;
  }

  static get styleTemplate() {
    return html`
      <style>
        .flex {
          display: flex;
          align-items: center;
        }
        .state {
          min-width: 45px;
          text-align: center;
        }
        paper-input {
          text-align: right;
        }
      </style>
    `;
  }

  static get inputNumberControlTemplate() {
    return html`
      <div>
        <template
          is="dom-if"
          if="[[_equals(_stateObj.attributes.mode, 'slider')]]"
        >
          <div class="flex">
            <ha-slider
              min="[[_min]]"
              max="[[_max]]"
              value="{{_value}}"
              step="[[_step]]"
              pin
              on-change="_selectedValueChanged"
              ignore-bar-touch
            ></ha-slider>
            <span class="state"
              >[[_value]] [[_stateObj.attributes.unit_of_measurement]]</span
            >
          </div>
        </template>
        <template
          is="dom-if"
          if="[[_equals(_stateObj.attributes.mode, 'box')]]"
        >
          <paper-input
            no-label-float
            auto-validate
            pattern="[0-9]+([\\.][0-9]+)?"
            step="[[_step]]"
            min="[[_min]]"
            max="[[_max]]"
            value="{{_value}}"
            type="number"
            on-change="_selectedValueChanged"
          ></paper-input>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object,
      _stateObj: {
        type: Object,
        computed: "_computeStateObj(hass.states, _config.entity)",
        observer: "_stateObjChanged",
      },
      _min: {
        type: Number,
        value: 0,
      },
      _max: {
        type: Number,
        value: 100,
      },
      _step: Number,
      _value: Number,
    };
  }

  ready() {
    super.ready();
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver((entries) => {
        entries.forEach(() => {
          this._hiddenState();
        });
      });
      ro.observe(this.$.input_number_card);
    } else {
      this.addEventListener("iron-resize", this._hiddenState);
    }
  }

  _equals(a, b) {
    return a === b;
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Entity not configured.");
    }
    this._config = config;
  }

  _hiddenState() {
    if (
      !this.$ ||
      !this._stateObj ||
      this._stateObj.attributes.mode !== "slider"
    )
      return;
    const width = this.$.input_number_card.offsetWidth;
    const stateEl = this.shadowRoot.querySelector(".state");
    if (!stateEl) return;
    stateEl.hidden = width <= 350;
  }

  _stateObjChanged(stateObj, oldStateObj) {
    if (!stateObj) return;

    this.setProperties({
      _min: Number(stateObj.attributes.min),
      _max: Number(stateObj.attributes.max),
      _step: Number(stateObj.attributes.step),
      _value: Number(stateObj.state),
    });
    if (
      oldStateObj &&
      stateObj.attributes.mode === "slider" &&
      oldStateObj.attributes.mode !== "slider"
    ) {
      this._hiddenState();
    }
  }

  _selectedValueChanged() {
    if (this._value === Number(this._stateObj.state)) return;

    this.hass.callService("input_number", "set_value", {
      value: this._value,
      entity_id: this._stateObj.entity_id,
    });
  }
}
customElements.define("hui-input-number-entity-row", HuiInputNumberEntityRow);
