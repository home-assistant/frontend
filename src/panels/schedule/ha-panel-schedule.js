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
import { LitElement, html, css } from "lit-element";
import "../../components/ha-menu-button";
import LocalizeMixin from "../../mixins/localize-mixin";
import { haStyle } from "../../resources/styles";

const baseRule = {
  active: true,
  start: "00:00",
  end: "00:00",
  days: [false, false, false, false, false, false, false],
};

const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
const switchStates = [
  { value: true, label: "On" },
  { value: false, label: "Off" },
];

function ePlatform(eid) {
  return eid.substr(0, eid.indexOf("."));
}
/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelSchedule extends LocalizeMixin(LitElement) {
  constructor() {
    super();
    this.rules = [];
    this.entities = [];
    this.modified = false;
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

  static get styles() {
    return [
      haStyle,
      css`
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
        .day.day-enabled {
          background-color: var(--primary-color);
        }
        .day.day-enabled.day-disabled {
          background-color: var(--disabled-text-color);
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
        .rule-text.text-disble {
          color: var(--disabled-text-color);
        }
      `,
    ];
  }

  render() {
    return html`
      <app-header-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              narrow="[[narrow]]"
              show-menu="[[showMenu]]"
            ></ha-menu-button>
            <div main-title>Schedule</div>
            <mwc-button class="save-button" @click=${this._saveAll}>
              Save${(this.modified && " •") || ""}</mwc-button
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
                <paper-item @click=${this._clearAllRules}>
                  Delete all rules</paper-item
                >
              </paper-listbox>
            </paper-menu-button>
          </app-toolbar>
        </app-header>

        <div class="content">
          ${this.rules.map(
            (rule, ruleIndex) =>
              html`
                <paper-card class="rule">
                  <paper-checkbox
                    ?checked=${rule.active}
                    @change=${this._updateActive(ruleIndex)}
                  >
                  </paper-checkbox>
                  <div class="rule-contents">
                    <div class="rule-row">
                      <span class="rule-text ${!rule.active && "text-disble"}">
                        Set</span
                      >
                      <paper-dropdown-menu
                        label="Entity"
                        no-label-float
                        @iron-select=${this._changeEntity(ruleIndex)}
                        ?disabled=${!rule.active}
                      >
                        <paper-listbox
                          slot="dropdown-content"
                          class="dropdown-content"
                          selected="${rule.entityId}"
                        >
                          ${this.entities.map(
                            (entity) =>
                              html`
                                <paper-item>${entity}</paper-item>
                              `
                          )}
                        </paper-listbox>
                      </paper-dropdown-menu>

                      <span class="rule-text ${!rule.active && "text-disble"}">
                        to
                      </span>
                      ${(this.isNumeric(rule.entity) &&
                        html`
                          <paper-input
                            class="input-temp"
                            no-label-float
                            value="${rule.value}"
                            @change=${this._saveEdit(ruleIndex)}
                            ?disabled=${!rule.active}
                            name="value"
                          >
                            <div slot="suffix">&#8451;</div>
                          </paper-input>
                        `) ||
                        null}
                      ${(this.isSwitch(rule.entity) &&
                        html`
                          <paper-dropdown-menu
                            label="Status"
                            no-label-float
                            @iron-select=${this._changeListValue(ruleIndex)}
                            ?disabled=${!rule.active}
                          >
                            <paper-listbox
                              slot="dropdown-content"
                              class="dropdown-content"
                              selected="${this.findSelected(
                                switchStates,
                                rule.value
                              )}"
                            >
                              ${switchStates.map(
                                (state) => html`
                                  <paper-item>${state.label}</paper-item>
                                `
                              )}
                            </paper-listbox>
                          </paper-dropdown-menu>
                        `) ||
                        null}
                      ${(!rule.entity &&
                        html`
                          <span class="rule-text no-value">-</span>
                        `) ||
                        null}
                    </div>
                    <div class="rule-row">
                      <span class="rule-text  ${!rule.active && "text-disble"}">
                        From
                      </span>
                      <paper-input
                        class="hour-input"
                        no-label-float
                        value="${rule.start}"
                        @change=${this._saveEdit(ruleIndex)}
                        ?disabled=${!rule.active}
                        name="start"
                      ></paper-input>
                      <span class="rule-text ${!rule.active && "text-disble"}"
                        >to</span
                      >
                      <paper-input
                        class="hour-input"
                        no-label-float
                        value="${rule.end}"
                        @change=${this._saveEdit(ruleIndex)}
                        ?disabled=${!rule.active}
                        name="end"
                      ></paper-input>
                      <span class="rule-text ${!rule.active && "text-disble"}"
                        >on</span
                      >

                      <div class="days">
                        ${rule.days.map(
                          (day, dayIndex) =>
                            html`
                              <div
                                class="day ${day
                                  ? "day-enabled"
                                  : ""} ${rule.active ? "" : "day-disabled"}"
                                @click=${this._dayClick(ruleIndex, dayIndex)}
                              >
                                <span>${weekDays[dayIndex]}</span>
                              </div>
                            `
                        )}
                      </div>
                    </div>
                  </div>
                </paper-card>
              `
          )}
          <mwc-button label="Add rule" @click=${this._addRule}></mwc-button>
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
      },
      entities: {
        type: Array,
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

  _clearAllRules() {
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
    this.rules.push(Object.assign({}, baseRule));
    this.modified = true;
    this.requestUpdate();
  }

  _changeEntity(index) {
    return (ev) => {
      const selected = ev.target.selected;
      if (this.rules[index].entity === this.entities[selected]) return;
      // Reset value if platform changes
      if (
        !this.rules[index].entity ||
        ePlatform(this.rules[index].entity) !==
          ePlatform(this.entities[selected])
      )
        Object.assign(this.rules[index], {
          value: "",
          entity: this.entities[selected],
          entityId: selected,
        });
      this.modified = true;
      this.requestUpdate();
    };
  }

  _changeListValue(index) {
    return (ev) => {
      const selected = ev.target.selected;
      if (this.rules[index].value === switchStates[selected].value) return;
      this.rules[index].value = switchStates[selected].value;
      this.modified = true;
      this.requestUpdate();
    };
  }

  _updateActive(index) {
    return (ev) => {
      const check = ev.target.checked;
      if (this.rules[index].active === check) return;
      this.rules[index].active = check;
      this.modified = true;
      this.requestUpdate();
    };
  }

  _saveEdit(index) {
    return (ev) => {
      const { value, name } = ev.target;
      if (this.rules[index][name] === value) return;
      this.rules[index][name] = value;
      this.modified = true;
      this.requestUpdate();
    };
  }

  _dayClick(index, dayIndex) {
    return () => {
      this.rules[index].days[dayIndex] = !this.rules[index].days[dayIndex];
      this.modified = true;
      this.requestUpdate();
    };
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
