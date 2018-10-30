import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-input/paper-input.js";
import "@polymer/paper-item/paper-icon-item.js";
import "@polymer/paper-item/paper-item-body.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";
import "@vaadin/vaadin-combo-box/vaadin-combo-box-light.js";

import "./state-badge.js";

import computeStateName from "../../common/entity/compute_state_name.js";
import LocalizeMixin from "../../mixins/localize-mixin.js";
import EventsMixin from "../../mixins/events-mixin.js";

/*
 * @appliesMixin LocalizeMixin
 */
class HaEntityPicker extends EventsMixin(LocalizeMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      paper-input > paper-icon-button {
        width: 24px;
        height: 24px;
        padding: 2px;
        color: var(--secondary-text-color);
      }
      [hidden] {
        display: none;
      }
    </style>
    <vaadin-combo-box-light
      items="[[_states]]"
      item-value-path="entity_id"
      item-label-path="entity_id"
      value="{{value}}"
      opened="{{opened}}"
      allow-custom-value="[[allowCustomEntity]]"
      on-change='_fireChanged'
    >
      <paper-input
        autofocus="[[autofocus]]"
        label="[[_computeLabel(label, localize)]]"
        class="input"
        autocapitalize='none'
        autocomplete='off'
        autocorrect='off'
        spellcheck='false'
        value="[[value]]"
        disabled="[[disabled]]">
        <paper-icon-button slot="suffix" class="clear-button" icon="hass:close" no-ripple="" hidden$="[[!value]]">Clear</paper-icon-button>
        <paper-icon-button slot="suffix" class="toggle-button" icon="[[_computeToggleIcon(opened)]]" hidden="[[!_states.length]]">Toggle</paper-icon-button>
      </paper-input>
      <template>
        <style>
          paper-icon-item {
            margin: -10px;
            padding: 0;
          }
        </style>
        <paper-icon-item>
          <state-badge state-obj="[[item]]" slot="item-icon"></state-badge>
          <paper-item-body two-line="">
            <div>[[_computeStateName(item)]]</div>
            <div secondary="">[[item.entity_id]]</div>
          </paper-item-body>
        </paper-icon-item>
      </template>
    </vaadin-combo-box-light>
`;
  }

  static get properties() {
    return {
      allowCustomEntity: {
        type: Boolean,
        value: false,
      },
      hass: {
        type: Object,
        observer: "_hassChanged",
      },
      _hass: Object,
      _states: {
        type: Array,
        computed: "_computeStates(_hass, domainFilter, entityFilter)",
      },
      autofocus: Boolean,
      label: {
        type: String,
      },
      value: {
        type: String,
        notify: true,
      },
      opened: {
        type: Boolean,
        value: false,
        observer: "_openedChanged",
      },
      domainFilter: {
        type: String,
        value: null,
      },
      entityFilter: {
        type: Function,
        value: null,
      },
      disabled: Boolean,
    };
  }

  _computeLabel(label, localize) {
    return label === undefined
      ? localize("ui.components.entity.entity-picker.entity")
      : label;
  }

  _computeStates(hass, domainFilter, entityFilter) {
    if (!hass) return [];

    let entityIds = Object.keys(hass.states);

    if (domainFilter) {
      entityIds = entityIds.filter(
        (eid) => eid.substr(0, eid.indexOf(".")) === domainFilter
      );
    }

    let entities = entityIds.sort().map((key) => hass.states[key]);

    if (entityFilter) {
      entities = entities.filter(entityFilter);
    }

    return entities;
  }

  _computeStateName(state) {
    return computeStateName(state);
  }

  _openedChanged(newVal) {
    if (!newVal) {
      this._hass = this.hass;
    }
  }

  _hassChanged(newVal) {
    if (!this.opened) {
      this._hass = newVal;
    }
  }

  _computeToggleIcon(opened) {
    return opened ? "hass:menu-up" : "hass:menu-down";
  }

  _fireChanged(ev) {
    ev.stopPropagation();
    this.fire("change");
  }
}

customElements.define("ha-entity-picker", HaEntityPicker);
