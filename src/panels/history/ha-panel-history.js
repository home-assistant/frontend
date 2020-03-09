import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@vaadin/vaadin-date-picker/theme/material/vaadin-date-picker";

import "../../components/ha-menu-button";
import "../../components/state-history-charts";
import "../../data/ha-state-history-data";
import "../../resources/ha-date-picker-style";
import "../../resources/ha-style";

import { formatDate } from "../../common/datetime/format_date";
import LocalizeMixin from "../../mixins/localize-mixin";
import { computeRTL } from "../../common/util/compute_rtl";

/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelHistory extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .content {
          padding: 0 16px 16px;
        }

        vaadin-date-picker {
          margin-right: 16px;
          max-width: 200px;
        }

        paper-dropdown-menu {
          max-width: 100px;
          margin-right: 16px;
          margin-top: 5px;
          --paper-input-container-label-floating: {
            padding-bottom: 11px;
          }
          --paper-input-suffix: {
            height: 24px;
          }
        }

        :host([rtl]) paper-dropdown-menu {
          text-align: right;
        }

        paper-item {
          cursor: pointer;
          white-space: nowrap;
        }
      </style>

      <ha-state-history-data
        hass="[[hass]]"
        filter-type="[[_filterType]]"
        start-time="[[_computeStartTime(_currentDate)]]"
        end-time="[[endTime]]"
        data="{{stateHistory}}"
        is-loading="{{isLoadingData}}"
      ></ha-state-history-data>
      <app-header-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <ha-menu-button
              hass="[[hass]]"
              narrow="[[narrow]]"
            ></ha-menu-button>
            <div main-title>[[localize('panel.history')]]</div>
          </app-toolbar>
        </app-header>

        <div class="flex content">
          <div class="flex layout horizontal wrap">
            <vaadin-date-picker
              id="picker"
              value="{{_currentDate}}"
              label="[[localize('ui.panel.history.showing_entries')]]"
              disabled="[[isLoadingData]]"
              required
            ></vaadin-date-picker>

            <paper-dropdown-menu
              label-float
              label="[[localize('ui.panel.history.period')]]"
              disabled="[[isLoadingData]]"
            >
              <paper-listbox
                slot="dropdown-content"
                selected="{{_periodIndex}}"
              >
                <paper-item
                  >[[localize('ui.duration.day', 'count', 1)]]</paper-item
                >
                <paper-item
                  >[[localize('ui.duration.day', 'count', 3)]]</paper-item
                >
                <paper-item
                  >[[localize('ui.duration.week', 'count', 1)]]</paper-item
                >
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          <state-history-charts
            hass="[[hass]]"
            history-data="[[stateHistory]]"
            is-loading-data="[[isLoadingData]]"
            end-time="[[endTime]]"
            no-single
          >
          </state-history-charts>
        </div>
      </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,

      stateHistory: {
        type: Object,
        value: null,
      },

      _periodIndex: {
        type: Number,
        value: 0,
      },

      isLoadingData: {
        type: Boolean,
        value: false,
      },

      endTime: {
        type: Object,
        computed: "_computeEndTime(_currentDate, _periodIndex)",
      },

      // ISO8601 formatted date string
      _currentDate: {
        type: String,
        value: function() {
          var value = new Date();
          var today = new Date(
            Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
          );
          return today.toISOString().split("T")[0];
        },
      },

      _filterType: {
        type: String,
        value: "date",
      },

      rtl: {
        type: Boolean,
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  datepickerFocus() {
    this.datePicker.adjustPosition();
  }

  connectedCallback() {
    super.connectedCallback();
    // We are unable to parse date because we use intl api to render date
    this.$.picker.set("i18n.parseDate", null);
    this.$.picker.set("i18n.formatDate", (date) =>
      formatDate(new Date(date.year, date.month, date.day), this.hass.language)
    );
  }

  _computeStartTime(_currentDate) {
    if (!_currentDate) return undefined;
    var parts = _currentDate.split("-");
    parts[1] = parseInt(parts[1]) - 1;
    return new Date(parts[0], parts[1], parts[2]);
  }

  _computeEndTime(_currentDate, periodIndex) {
    var startTime = this._computeStartTime(_currentDate);
    var endTime = new Date(startTime);
    endTime.setDate(startTime.getDate() + this._computeFilterDays(periodIndex));
    return endTime;
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

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}

customElements.define("ha-panel-history", HaPanelHistory);
