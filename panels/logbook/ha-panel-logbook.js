import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-spinner/paper-spinner.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@vaadin/vaadin-date-picker/vaadin-date-picker.js';

import '../../src/components/ha-menu-button.js';
import '../../src/resources/ha-date-picker-style.js';
import '../../src/resources/ha-style.js';
import '../../src/util/hass-mixins.js';
import './ha-logbook-data.js';
import './ha-logbook.js';

import formatDate from '../../js/common/datetime/format_date.js';

/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 */
class HaPanelLogbook extends window.hassMixins.LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style">
    .content {
      padding: 0 16px 16px;
    }

    paper-spinner {
      position: absolute;
      top: 15px;
      left: 186px;
    }

    vaadin-date-picker {
      --vaadin-date-picker-clear-icon: {
        display: none;
      }
      margin-bottom: 24px;
      max-width: 200px;
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
    ></ha-logbook-data>

    <app-header-layout has-scrolling-region>
      <app-header slot="header" fixed>
        <app-toolbar>
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>[[localize('panel.logbook')]]</div>
          <paper-icon-button
            icon='mdi:refresh'
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

        <vaadin-date-picker
          id='picker'
          value='{{_currentDate}}'
          label="[[localize('ui.panel.logbook.showing_entries')]]"
          disabled='[[isLoading]]'
          required
        ></vaadin-date-picker>


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
        value: function () {
          const value = new Date();
          const today = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
          return today.toISOString().split('T')[0];
        }
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
    this.$.picker.set('i18n.parseDate', null);
    this.$.picker.set('i18n.formatDate', function (date) {
      return formatDate(new Date(date.year, date.month, date.day));
    });
  }

  _computeFilterDate(_currentDate) {
    if (!_currentDate) return undefined;
    var parts = _currentDate.split('-');
    parts[1] = parseInt(parts[1]) - 1;
    return new Date(parts[0], parts[1], parts[2]).toISOString();
  }

  refreshLogbook() {
    this.shadowRoot.querySelector('ha-logbook-data').refreshLogbook();
  }
}

customElements.define('ha-panel-logbook', HaPanelLogbook);
