import "@polymer/app-layout/app-header-layout/app-header-layout.js";
import "@polymer/app-layout/app-header/app-header.js";
import "@polymer/app-layout/app-toolbar/app-toolbar.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-input/paper-input.js";
import "@polymer/paper-spinner/paper-spinner.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";
import "@vaadin/vaadin-date-picker/vaadin-date-picker.js";

import "../../components/ha-menu-button.js";
import "../../components/entity/ha-entity-picker.js";
import "../../resources/ha-date-picker-style.js";
import "../../resources/ha-style.js";

import "./ha-logbook-data.js";
import "./ha-logbook.js";

import formatDate from "../../common/datetime/format_date.js";
import LocalizeMixin from "../../mixins/localize-mixin.js";

/*
 * @appliesMixin LocalizeMixin
 */
class HaPanelLogbook extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style">
    .content {
      padding: 0 16px 16px;
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

    vaadin-date-picker {
      --vaadin-date-picker-clear-icon: {
        display: none;
      }
      max-width: 200px;
      margin-right: 16px;
    }

    paper-dropdown-menu {
      max-width: 100px;
      margin-right: 16px;
    }

    paper-item {
      cursor: pointer;
    }

    ha-entity-picker {
      display: inline-block;
      width: 100%;
      max-width: 400px;
    }

    [hidden] {
      display: none !important;
    }
    </style>

    <ha-logbook-data
      hass='[[hass]]'
      is-loading='{{isLoading}}'
      entries='{{entries}}'
      filter-date='[[_computeFilterDate(_currentDate)]]'
      filter-period='[[_computeFilterDays(_periodIndex)]]'
      filter-entity='[[entityId]]'
    ></ha-logbook-data>

    <app-header-layout has-scrolling-region>
      <app-header slot="header" fixed>
        <app-toolbar>
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>[[localize('panel.logbook')]]</div>
          <paper-icon-button
            icon='hass:refresh'
            on-click='refreshLogbook'
            hidden$='[[isLoading]]'
          ></paper-icon-button>
        </app-toolbar>
      </app-header>

      <div class="content">
        <paper-spinner
          active='[[isLoading]]'
          hidden$='[[!isLoading]]'
          alt="[[localize('ui.common.loading')]]"
        ></paper-spinner>

        <div class="flex layout horizontal wrap">
          <vaadin-date-picker
            id='picker'
            value='{{_currentDate}}'
            label="[[localize('ui.panel.logbook.showing_entries')]]"
            disabled='[[isLoading]]'
            required
          ></vaadin-date-picker>

          <paper-dropdown-menu
            label-float
            label="[[localize('ui.panel.logbook.period')]]"
            disabled='[[isLoading]]'
          >
            <paper-listbox
              slot="dropdown-content"
              selected="{{_periodIndex}}"
            >
              <paper-item>[[localize('ui.duration.day', 'count', 1)]]</paper-item>
              <paper-item>[[localize('ui.duration.day', 'count', 3)]]</paper-item>
              <paper-item>[[localize('ui.duration.week', 'count', 1)]]</paper-item>
            </paper-listbox>
          </paper-dropdown-menu>

          <ha-entity-picker
            hass="[[hass]]"
            value="{{_entityId}}"
            label="[[localize('ui.components.entity.entity-picker.entity')]]"
            disabled='[[isLoading]]'
            on-change='_entityPicked'
          ></ha-entity-picker>
        </div>

        <ha-logbook hass='[[hass]]' entries="[[entries]]" hidden$='[[isLoading]]'></ha-logbook>
      </div>
    </app-header-layout>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      narrow: {
        type: Boolean,
        value: false,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },

      // ISO8601 formatted date string
      _currentDate: {
        type: String,
        value: function() {
          const value = new Date();
          const today = new Date(
            Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
          );
          return today.toISOString().split("T")[0];
        },
      },

      _periodIndex: {
        type: Number,
        value: 0,
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
    };
  }

  connectedCallback() {
    super.connectedCallback();
    // We are unable to parse date because we use intl api to render date
    this.$.picker.set("i18n.parseDate", null);
    this.$.picker.set("i18n.formatDate", (date) =>
      formatDate(new Date(date.year, date.month, date.day), this.hass.language)
    );
  }

  _computeFilterDate(_currentDate) {
    if (!_currentDate) return undefined;
    var parts = _currentDate.split("-");
    parts[1] = parseInt(parts[1]) - 1;
    return new Date(parts[0], parts[1], parts[2]).toISOString();
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

  _entityPicked(ev) {
    this._setEntityId(ev.target.value);
  }

  refreshLogbook() {
    this.shadowRoot.querySelector("ha-logbook-data").refreshLogbook();
  }
}

customElements.define("ha-panel-logbook", HaPanelLogbook);
