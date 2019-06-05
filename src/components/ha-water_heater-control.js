import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { EventsMixin } from "../mixins/events-mixin";

/*
 * @appliesMixin EventsMixin
 */
class HaWaterHeaterControl extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-flex iron-flex-alignment"></style>
      <style>
        /* local DOM styles go here */
        :host {
          @apply --layout-flex;
          @apply --layout-horizontal;
          @apply --layout-justified;
        }
        .in-flux#target_temperature {
          color: var(--google-red-500);
        }
        #target_temperature {
          @apply --layout-self-center;
          font-size: 200%;
        }
        .control-buttons {
          font-size: 200%;
          text-align: right;
        }
        paper-icon-button {
          height: 48px;
          width: 48px;
        }
      </style>

      <!-- local DOM goes here -->
      <div id="target_temperature">[[value]] [[units]]</div>
      <div class="control-buttons">
        <div>
          <paper-icon-button
            icon="hass:chevron-up"
            on-click="incrementValue"
          ></paper-icon-button>
        </div>
        <div>
          <paper-icon-button
            icon="hass:chevron-down"
            on-click="decrementValue"
          ></paper-icon-button>
        </div>
      </div>
    `;
  }

  static get properties() {
    return {
      value: {
        type: Number,
        observer: "valueChanged",
      },
      units: {
        type: String,
      },
      min: {
        type: Number,
      },
      max: {
        type: Number,
      },
      step: {
        type: Number,
        value: 1,
      },
    };
  }

  temperatureStateInFlux(inFlux) {
    this.$.target_temperature.classList.toggle("in-flux", inFlux);
  }

  incrementValue() {
    const newval = this.value + this.step;
    if (this.value < this.max) {
      this.last_changed = Date.now();
      this.temperatureStateInFlux(true);
    }
    if (newval <= this.max) {
      // If no initial target_temp
      // this forces control to start
      // from the min configured instead of 0
      if (newval <= this.min) {
        this.value = this.min;
      } else {
        this.value = newval;
      }
    } else {
      this.value = this.max;
    }
  }

  decrementValue() {
    const newval = this.value - this.step;
    if (this.value > this.min) {
      this.last_changed = Date.now();
      this.temperatureStateInFlux(true);
    }
    if (newval >= this.min) {
      this.value = newval;
    } else {
      this.value = this.min;
    }
  }

  valueChanged() {
    // when the last_changed timestamp is changed,
    // trigger a potential event fire in
    // the future, as long as last changed is far enough in the
    // past.
    if (this.last_changed) {
      window.setTimeout(() => {
        const now = Date.now();
        if (now - this.last_changed >= 2000) {
          this.fire("change");
          this.temperatureStateInFlux(false);
          this.last_changed = null;
        }
      }, 2010);
    }
  }
}

customElements.define("ha-water_heater-control", HaWaterHeaterControl);
