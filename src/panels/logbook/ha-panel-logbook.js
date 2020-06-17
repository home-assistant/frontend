import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "../../components/ha-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-spinner/paper-spinner";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { formatDateTime } from "../../common/datetime/format_date_time";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/entity/ha-entity-picker";
import "../../components/ha-menu-button";
import LocalizeMixin from "../../mixins/localize-mixin";
import "../../resources/ha-date-picker-style";
import "../../styles/polymer-ha-style";
import "./ha-logbook";
import "./ha-logbook-data";
import "../../components/date-range-picker";

/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelLogbook extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style">
        ha-logbook {
          height: calc(100vh - 136px);
        }

        :host([narrow]) ha-logbook {
          height: calc(100vh - 198px);
        }

        date-range-picker {
          margin-right: 4px;
        }

        date-range-picker ha-icon {
          margin-right: 8px;
        }

        date-range-picker paper-input {
          display: inline-block;
          max-width: 200px;
          width: 200px;
        }

        paper-input {
          max-width: 50px;
          margin-right: 16px;
        }

        paper-spinner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }

        .wrap {
          margin-bottom: 24px;
        }

        .filters {
          display: flex;
          align-items: flex-end;
          padding: 0 16px;
        }

        :host([narrow]) .filters {
          flex-wrap: wrap;
        }

        paper-item {
          cursor: pointer;
          white-space: nowrap;
        }

        ha-entity-picker {
          display: inline-block;
          flex-grow: 1;
          max-width: 400px;
          --paper-input-suffix: {
            height: 24px;
          }
        }

        :host([narrow]) ha-entity-picker {
          max-width: none;
          width: 100%;
        }

        [hidden] {
          display: none !important;
        }
      </style>

      <ha-logbook-data
        hass="[[hass]]"
        is-loading="{{isLoading}}"
        entries="{{entries}}"
        filter-start-date="[[_computeFilterStartDate(_startDate)]]"
        filter-end-date="[[_computeFilterEndDate(_endDate)]]"
        filter-entity="[[entityId]]"
      ></ha-logbook-data>

      <app-header-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              hass="[[hass]]"
              narrow="[[narrow]]"
            ></ha-menu-button>
            <div main-title>[[localize('panel.logbook')]]</div>
            <ha-icon-button
              icon="hass:refresh"
              on-click="refreshLogbook"
              hidden$="[[isLoading]]"
            ></ha-icon-button>
          </app-toolbar>
        </app-header>

        <paper-spinner
          active="[[isLoading]]"
          hidden$="[[!isLoading]]"
          alt="[[localize('ui.common.loading')]]"
        ></paper-spinner>

        <div class="filters">
          <date-range-picker
            disabled$="[[isLoading]]"
            twentyfour-hours$="[[_compute24hourFormat(hass)]]"
            start-date$="[[_startDate]]"
            end-date$="[[_endDate]]"
            on-change="_dateRangeChanged"
          >
            <div slot="input">
              <ha-icon icon="mdi:calendar"></ha-icon>
              <paper-input
                value="[[_formatDate(hass, _startDate)]]"
                label="From"
                disabled="[[isLoading]]"
                readonly=""
              ></paper-input>
              <paper-input
                value="[[_formatDate(hass, _endDate)]]"
                label="Till"
                disabled="[[isLoading]]"
                readonly=""
              ></paper-input>
            </div>
            <div slot="header"></div>
            <div slot="footer"></div>
          </date-range-picker>

          <ha-entity-picker
            hass="[[hass]]"
            value="{{_entityId}}"
            label="[[localize('ui.components.entity.entity-picker.entity')]]"
            disabled="[[isLoading]]"
            on-change="_entityPicked"
          ></ha-entity-picker>
        </div>

        <ha-logbook
          hass="[[hass]]"
          entries="[[entries]]"
          hidden$="[[isLoading]]"
        ></ha-logbook>
      </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,

      narrow: { type: Boolean, reflectToAttribute: true },

      _dateRange: { type: Object, value: { startDate: null, endDate: null } },

      _startDate: {
        type: Date,
        value: function () {
          const value = new Date();
          value.setHours(value.getHours() - 2);
          value.setMinutes(0);
          value.setSeconds(0);
          return value;
        },
      },

      _endDate: {
        type: Date,
        value: function () {
          const value = new Date();
          value.setHours(value.getHours() + 1);
          value.setMinutes(0);
          value.setSeconds(0);
          return value;
        },
      },

      _entityId: {
        type: String,
        value: "",
      },

      entityId: {
        type: String,
        value: "",
        readOnly: true,
      },

      isLoading: {
        type: Boolean,
      },

      entries: {
        type: Array,
      },

      datePicker: {
        type: Object,
      },

      rtl: {
        type: Boolean,
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  ready() {
    super.ready();
    this.hass.loadBackendTranslation("title");
  }

  _computeFilterStartDate(_startDate) {
    if (!_startDate) return undefined;
    return _startDate.toISOString();
  }

  _computeFilterEndDate(_endDate) {
    if (!_endDate) return undefined;
    if (_endDate.getHours() === 0) {
      _endDate.setDate(_endDate.getDate() + 1);
      _endDate.setMilliseconds(_endDate.getMilliseconds() - 1);
    }
    return _endDate.toISOString();
  }

  _computeFilterDays(periodIndex) {
    switch (periodIndex) {
      case 1:
        return 3;
      case 2:
        return 7;
      default:
        return 1;
    }
  }

  _formatDate(hass, date) {
    return formatDateTime(date, hass.language);
  }

  _compute24hourFormat(hass) {
    return (
      new Intl.DateTimeFormat(hass.language, {
        hour: "numeric",
      })
        .formatToParts(new Date(2020, 0, 1, 13))
        .find((part) => part.type === "hour").value.length === 2
    );
  }

  _dateRangeChanged(ev) {
    console.log(ev.detail);
    this._startDate = ev.detail.startDate;
    this._endDate = ev.detail.endDate;
  }

  _entityPicked(ev) {
    this._setEntityId(ev.target.value);
  }

  refreshLogbook() {
    this.shadowRoot.querySelector("ha-logbook-data").refreshLogbook();
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}

customElements.define("ha-panel-logbook", HaPanelLogbook);
