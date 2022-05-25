import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { IronResizableBehavior } from "@polymer/iron-resizable-behavior/iron-resizable-behavior";
import { mixinBehaviors } from "@polymer/polymer/lib/legacy/class";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import "../components/entity/state-info";
import "../components/ha-slider";
import "../components/ha-textfield";

class StateCardInputNumber extends mixinBehaviors(
  [IronResizableBehavior],
  PolymerElement
) {
  static get template() {
    return html`
      <style include="iron-flex iron-flex-alignment"></style>
      <style>
        ha-slider {
          margin-left: auto;
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
        ha-slider[hidden],
        ha-textfield[hidden] {
          display: none !important;
        }
        ha-textfield {
          text-align: right;
          margin-left: auto;
        }
      </style>

      <div class="horizontal justified layout" id="input_number_card">
        ${this.stateInfoTemplate}
        <ha-slider
          min="[[min]]"
          max="[[max]]"
          value="{{value}}"
          step="[[step]]"
          hidden="[[hiddenslider]]"
          pin
          on-change="selectedValueChanged"
          on-click="stopPropagation"
          id="slider"
          ignore-bar-touch=""
        >
        </ha-slider>
        <ha-textfield
          no-label-float=""
          auto-validate=""
          pattern="[0-9]+([\\.][0-9]+)?"
          step="[[step]]"
          min="[[min]]"
          max="[[max]]"
          value="[[value]]"
          type="number"
          on-change="selectedValueChanged"
          on-click="stopPropagation"
          on-input="onInput"
          hidden="[[hiddenbox]]"
          suffix="[[stateObj.attributes.unit_of_measurement]]"
        >
        </ha-textfield>
        <div
          id="sliderstate"
          class="state sliderstate"
          hidden="[[hiddenslider]]"
        >
          [[formattedState]]
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
      ro.observe(this.$.input_number_card);
    } else {
      this.addEventListener("iron-resize", this.hiddenState);
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
      formattedState: String,
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
    this.setProperties({
      min: Number(newVal.attributes.min),
      max: Number(newVal.attributes.max),
      step: Number(newVal.attributes.step),
      value: Number(newVal.state),
      formattedState: computeStateDisplay(
        this.hass.localize,
        newVal,
        this.hass.locale,
        newVal.state
      ),
      mode: String(newVal.attributes.mode),
      maxlength: String(newVal.attributes.max).length,
      hiddenbox: newVal.attributes.mode !== "box",
      hiddenslider: newVal.attributes.mode !== "slider",
    });
    if (this.mode === "slider" && prevMode !== "slider") {
      this.hiddenState();
    }
  }

  onInput(ev) {
    this.value = ev.target.value;
  }

  selectedValueChanged() {
    if (this.value === Number(this.stateObj.state)) {
      return;
    }
    this.hass.callService("input_number", "set_value", {
      value: this.value,
      entity_id: this.stateObj.entity_id,
    });
  }

  stopPropagation(ev) {
    ev.stopPropagation();
  }
}

customElements.define("state-card-input_number", StateCardInputNumber);
