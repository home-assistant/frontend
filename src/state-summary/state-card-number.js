import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { IronResizableBehavior } from "@polymer/iron-resizable-behavior/iron-resizable-behavior";
import { mixinBehaviors } from "@polymer/polymer/lib/legacy/class";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../components/entity/state-info";
import "../components/ha-slider";
import "../components/ha-textfield";

class StateCardNumber extends mixinBehaviors(
  [IronResizableBehavior],
  PolymerElement
) {
  static get template() {
    return html`
      <style include="iron-flex iron-flex-alignment"></style>
      <style>
        ha-slider {
          margin-left: auto;
          flex-grow: 1;
        }
        .state {
          @apply --paper-font-body1;
          color: var(--primary-text-color);

          display: flex;
          align-items: center;
          justify-content: end;
        }
        .sliderstate {
          min-width: 45px;
        }
        [hidden] {
          display: none !important;
        }
        ha-textfield {
          text-align: right;
          margin-left: auto;
        }
      </style>

      <div class="horizontal justified layout" id="number_card">
        ${this.stateInfoTemplate}
        <ha-slider
          labeled
          min="[[min]]"
          max="[[max]]"
          value="{{value}}"
          step="[[step]]"
          hidden="[[hiddenslider]]"
          on-change="selectedValueChanged"
          on-click="stopPropagation"
          id="slider"
        >
        </ha-slider>
        <ha-textfield
          auto-validate=""
          pattern="[0-9]+([\\.][0-9]+)?"
          step="[[step]]"
          min="[[min]]"
          max="[[max]]"
          value="[[value]]"
          type="number"
          on-input="onInput"
          on-change="selectedValueChanged"
          on-click="stopPropagation"
          hidden="[[hiddenbox]]"
        >
        </ha-textfield>
        <div class="state" hidden="[[hiddenbox]]">
          [[stateObj.attributes.unit_of_measurement]]
        </div>
        <div
          id="sliderstate"
          class="state sliderstate"
          hidden="[[hiddenslider]]"
        >
          [[value]] [[stateObj.attributes.unit_of_measurement]]
        </div>
      </div>
    `;
  }

  static get stateInfoTemplate() {
    return html`
      <state-info
        hass="[[hass]]"
        state-obj="[[stateObj]]"
        in-dialog="[[inDialog]]"
      ></state-info>
    `;
  }

  ready() {
    super.ready();
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver((entries) => {
        entries.forEach(() => {
          this.hiddenState();
        });
      });
      ro.observe(this.$.number_card);
    } else {
      this.addEventListener("iron-resize", () => this.hiddenState());
    }
  }

  static get properties() {
    return {
      hass: Object,
      hiddenbox: {
        type: Boolean,
        value: true,
      },
      hiddenslider: {
        type: Boolean,
        value: true,
      },
      inDialog: {
        type: Boolean,
        value: false,
      },
      stateObj: {
        type: Object,
        observer: "stateObjectChanged",
      },
      min: {
        type: Number,
        value: 0,
      },
      max: {
        type: Number,
        value: 100,
      },
      maxlength: {
        type: Number,
        value: 3,
      },
      step: Number,
      value: Number,
      mode: String,
    };
  }

  hiddenState() {
    if (this.mode !== "slider") return;
    const sliderwidth = this.$.slider.offsetWidth;
    if (sliderwidth < 100) {
      this.$.sliderstate.hidden = true;
    } else if (sliderwidth >= 145) {
      this.$.sliderstate.hidden = false;
    }
  }

  stateObjectChanged(newVal) {
    const prevMode = this.mode;
    const min = Number(newVal.attributes.min);
    const max = Number(newVal.attributes.max);
    const step = Number(newVal.attributes.step);
    const range = (max - min) / step;

    this.setProperties({
      min: min,
      max: max,
      step: step,
      value: Number(newVal.state),
      mode: String(newVal.attributes.mode),
      maxlength: String(newVal.attributes.max).length,
      hiddenbox:
        newVal.attributes.mode === "slider" ||
        (newVal.attributes.mode === "auto" && range <= 256),
      hiddenslider:
        newVal.attributes.mode === "box" ||
        (newVal.attributes.mode === "auto" && range > 256),
    });
    if (this.mode === "slider" && prevMode !== "slider") {
      this.hiddenState();
    }
  }

  onInput(ev) {
    this.value = ev.target.value;
  }

  selectedValueChanged(ev) {
    if (ev.target.value === Number(this.stateObj.state)) {
      return;
    }
    this.hass.callService("number", "set_value", {
      value: ev.target.value,
      entity_id: this.stateObj.entity_id,
    });
  }

  stopPropagation(ev) {
    ev.stopPropagation();
  }
}

customElements.define("state-card-number", StateCardNumber);
