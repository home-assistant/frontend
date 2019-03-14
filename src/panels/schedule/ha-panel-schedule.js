import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-menu-button/paper-menu-button";
import "@material/mwc-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../components/ha-menu-button";
import LocalizeMixin from "../../mixins/localize-mixin";

const baseRule = {
  active: true,
  start: "00:00",
  end: "00:00",
  days: [false, false, false, false, false, false, false],
};

function ePlatform(eid) {
  return eid.substr(0, eid.indexOf("."));
}
/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelSchedule extends LocalizeMixin(PolymerElement) {
  constructor() {
    super();
    this.switchStates = [
      { value: true, label: "On" },
      { value: false, label: "Off" },
    ];
  }

  isNumeric(entityId) {
    if (!entityId) return false;
    return ePlatform(entityId) === "climate";
  }

  isSwitch(entityId) {
    if (!entityId) return false;
    const platform = ePlatform(entityId);
    return (
      platform === "light" ||
      platform === "switch" ||
      platform === "input_boolean"
    );
  }

  findSelected(arr, value) {
    if (!arr || typeof value === "undefined") return undefined;
    return arr.findIndex((el) => el.value === value);
  }

  getIndex(arr, i) {
    if (!arr) return undefined;
    return arr[i];
  }

  dot(mod) {
    return (mod && " •") || "";
  }

  static get template() {
    return html`
      <style include="ha-style">
        :host {
          height: 100%;
        }
        app-toolbar paper-listbox {
          width: 150px;
        }
        app-toolbar paper-item {
          cursor: pointer;
        }
        .content {
          padding-top: 8px;
          padding-bottom: 32px;
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        paper-card {
          display: block;
          padding: 8px;
        }
        .rule {
          display: flex;
          margin-bottom: 8px;
          align-items: center;
        }
        .rule > * {
          margin: 4px;
        }
        .days {
          display: flex;
          align-items: center;
        }
        .day {
          background-color: var(--disabled-text-color);
          height: 24px;
          width: 24px;
          border-radius: 12px;
          margin-left: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          color: white;
        }
        .day.true-true {
          background-color: var(--primary-color);
        }
        .hour-input {
          width: 4em;
        }
        .rule-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }
        .rule-row > * {
          margin: 4px;
        }
        paper-dropdown-menu {
          max-width: 10em;
        }
        .input-temp {
          max-width: 4em;
        }
        .save-button {
          --mdc-theme-on-primary: black;
          --mdc-theme-primary: white;
          --mdc-theme-on-secondary: black;
          --mdc-theme-secondary: white;
        }
        .rule-text.true {
          color: var(--disabled-text-color);
        }
      </style>

      <app-header-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              narrow="[[narrow]]"
              show-menu="[[showMenu]]"
            ></ha-menu-button>
            <div main-title>Schedule</div>
            <mwc-button class="save-button" on-click="_saveAll"
              >Save[[dot(modified)]]</mwc-button
            >
            <paper-menu-button
              horizontal-align="right"
              horizontal-offset="-5"
              vertical-offset="-5"
            >
              <paper-icon-button
                icon="hass:dots-vertical"
                slot="dropdown-trigger"
              ></paper-icon-button>
              <paper-listbox slot="dropdown-content">
                <paper-item on-click="_clearCompleted"
                  >Delete all rules</paper-item
                >
              </paper-listbox>
            </paper-menu-button>
          </app-toolbar>
        </app-header>

        <div class="content">
          <template is="dom-repeat" items="[[rules]]">
            <paper-card class="rule">
              <paper-checkbox
                checked="[[item.active]]"
                on-change="_updateActive"
              >
              </paper-checkbox>
              <div class="rule-contents">
                <div class="rule-row">
                  <span class$="rule-text [[!item.active]]">Set</span>
                  <paper-dropdown-menu
                    label="Entity"
                    no-label-float
                    on-iron-select="_changeEntity"
                    disabled="[[!item.active]]"
                  >
                    <paper-listbox
                      slot="dropdown-content"
                      class="dropdown-content"
                      selected="[[item.entityId]]"
                    >
                      <template is="dom-repeat" items="[[entities]]">
                        <paper-item>[[item]]</paper-item>
                      </template>
                    </paper-listbox>
                  </paper-dropdown-menu>

                  <span class$="rule-text [[!item.active]]">to</span>

                  <template is="dom-if" if="[[isNumeric(item.entity)]]">
                    <paper-input
                      class="input-temp"
                      no-label-float
                      value="[[item.value]]"
                      on-change="_saveEdit"
                      disabled="[[!item.active]]"
                      name="value"
                    >
                      <div slot="suffix">&#8451;</div>
                    </paper-input>
                  </template>
                  <template is="dom-if" if="[[isSwitch(item.entity)]]">
                    <paper-dropdown-menu
                      label="Status"
                      no-label-float
                      on-iron-select="_changeListValue"
                      disabled="[[!item.active]]"
                    >
                      <paper-listbox
                        slot="dropdown-content"
                        class="dropdown-content"
                        selected="[[findSelected(switchStates,item.value)]]"
                      >
                        <template
                          is="dom-repeat"
                          items="[[switchStates]]"
                          as="state"
                        >
                          <paper-item>[[state.label]]</paper-item>
                        </template>
                      </paper-listbox>
                    </paper-dropdown-menu>
                  </template>
                  <template is="dom-if" if="[[!item.entity]]">
                    <span class="rule-text no-value">-</span>
                  </template>
                </div>
                <div class="rule-row">
                  <span class$="rule-text  [[!item.active]]">From</span>
                  <paper-input
                    class="hour-input"
                    no-label-float
                    value="[[item.start]]"
                    on-change="_saveEdit"
                    disabled="[[!item.active]]"
                    name="start"
                  ></paper-input>
                  <span class$="rule-text  [[!item.active]]">to</span>
                  <paper-input
                    class="hour-input"
                    no-label-float
                    value="[[item.end]]"
                    on-change="_saveEdit"
                    disabled="[[!item.active]]"
                    name="end"
                  ></paper-input>
                  <span class$="rule-text  [[!item.active]]">on</span>
                  <div class="days">
                    <template
                      is="dom-repeat"
                      items="[[item.days]]"
                      as="day"
                      index-as="dayIndex"
                    >
                      <div
                        class$="day [[day]]-[[item.active]]"
                        on-click="_dayClick"
                      >
                        <span>{{getIndex(days, dayIndex)}}</span>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </paper-card>
          </template>
          <mwc-button label="Add rule" on-click="_addRule"></mwc-button>
        </div>
      </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      showMenu: Boolean,
      modified: Boolean,
      rules: {
        type: Array,
        value: [],
      },
      entities: {
        type: Array,
        value: [],
      },
      days: {
        type: Array,
        value: ["M", "T", "W", "T", "F", "S", "S"],
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._fetchData = this._fetchData.bind(this);

    this.hass.connection.subscribeEvents(this._fetchData, "rules_updated").then(
      function(unsub) {
        this._unsubEvents = unsub;
      }.bind(this)
    );
    this._fetchData();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEvents) this._unsubEvents();
  }

  _fetchData() {
    this.hass
      .callWS({
        type: "schedule/entities",
      })
      .then((response) => {
        this.entities = response.entities;
        return this.hass.callWS({
          type: "schedule/rules",
        });
      })
      .then((response) => {
        this.rules = response.rules.map((rule) => {
          return {
            ...rule,
            entityId: this.entities.findIndex((e) => e === rule.entity),
          };
        });
        this.modified = false;
      });
  }

  _clearCompleted() {
    this.hass
      .callWS({
        type: "schedule/clear",
      })
      .then((response) => {
        if (response.completed === true) {
          return true;
        }
        throw new Error("ClearingFailed");
      })
      .then(this._fetchData);
  }

  _addRule() {
    this.push("rules", baseRule);
    this.modified = true;
  }

  _changeEntity(ev) {
    const { index, item } = ev.model;
    const selected = ev.target.selected;
    if (item.entityId === selected) return;
    // Reset value if platform changes
    if (
      !item.entity ||
      ePlatform(item.entity) !== ePlatform(this.entities[selected])
    )
      this.set(`rules.${index}.value`, undefined);

    this.set(`rules.${index}.entity`, this.entities[selected]);
    this.set(`rules.${index}.entityId`, selected);
    this.modified = true;
  }

  _changeListValue(ev) {
    const { index, item } = ev.model;
    const selected = ev.target.selected;
    if (item.value === this.switchStates[selected].value) return;
    this.set(`rules.${index}.value`, this.switchStates[selected].value);
    this.modified = true;
  }

  _updateActive(ev) {
    const { index, item } = ev.model;
    const check = ev.target.checked;
    if (item.active === check) return;
    this.set(`rules.${index}.active`, check);
    this.modified = true;
  }

  _saveEdit(ev) {
    const { index, item } = ev.model;
    const { value, name } = ev.target;
    if (item[name] === value) return;
    this.set(`rules.${index}.${name}`, value);
    this.modified = true;
  }

  _dayClick(ev) {
    const dayIndex = ev.model.dayIndex;
    const index = ev.model.parentModel.index;
    this.set(
      `rules.${index}.days.${dayIndex}`,
      !this.rules[index].days[dayIndex]
    );
    this.modified = true;
  }

  _saveAll() {
    this.hass
      .callWS({
        type: "schedule/save",
        rules: this.rules,
      })
      .then((response) => {
        if (response.completed === true) {
          this.modified = false;
          return true;
        }
        throw new Error("ClearingFailed");
      });
  }
}

customElements.define("ha-panel-schedule", HaPanelSchedule);
