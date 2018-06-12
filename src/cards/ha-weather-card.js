import '@polymer/iron-icon/iron-icon.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/ha-card.js';

import EventsMixin from '../mixins/events-mixin.js';
import LocalizeMixin from '../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaWeatherCard extends
  LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        :host {
          cursor: pointer;
        }

        .content {
          padding: 0 20px 20px;
        }

        iron-icon {
          color: var(--paper-item-icon-color);
        }

        .now {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
        }

        .main {
          display: flex;
          align-items: center;
          margin-right: 32px;
        }

        .main iron-icon {
          --iron-icon-height: 72px;
          --iron-icon-width: 72px;
          margin-right: 8px;
        }

        .main .temp {
          font-size: 52px;
          line-height: 1em;
          position: relative;
        }

        .main .temp span {
          font-size: 24px;
          line-height: 1em;
          position: absolute;
          top: 4px;
        }

        .now-text {
          font-size: 24px;
        }

        .forecast {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
        }

        .forecast div {
          flex: 0 0 auto;
          text-align: center;
        }

        .forecast .icon {
          margin: 8px 0;
          text-align: center;
        }

        .weekday {
          text-transform: uppercase;
        }

        .attributes,
        .templow,
        .precipitation {      {
          color: var(--secondary-text-color);
        }
      </style>
      <ha-card header="[[stateObj.attributes.friendly_name]]">
        <div class="content">
          <div class="now">
            <div class="main">
              <template is="dom-if" if="[[showWeatherIcon(stateObj.state)]]">
                <iron-icon icon="[[getWeatherIcon(stateObj.state)]]"></iron-icon>
              </template>
              <div class="temp">
                [[stateObj.attributes.temperature]]<span>[[getUnit('temperature')]]</span>
              </div>
            </div>
            <div class="attributes">
              <template is="dom-if" if="[[_showValue(stateObj.attributes.pressure)]]">
                <div>
                  [[localize('ui.card.weather.attributes.air_pressure')]]:
                  [[stateObj.attributes.pressure]] hPa
                </div>
              </template>
              <template is="dom-if" if="[[_showValue(stateObj.attributes.humidity)]]">
                <div>
                  [[localize('ui.card.weather.attributes.humidity')]]:
                  [[stateObj.attributes.humidity]] %
                </div>
              </template>
              <template is="dom-if" if="[[_showValue(stateObj.attributes.wind_speed)]]">
                <div>
                  [[localize('ui.card.weather.attributes.wind_speed')]]:
                  [[getWind(stateObj.attributes.wind_speed, stateObj.attributes.wind_bearing, localize)]]
                </div>
              </template>
            </div>
          </div>
          <div class="now-text">
            [[computeState(stateObj.state, localize)]]
          </div>
          <template is="dom-if" if="[[forecast]]">
            <div class="forecast">
              <template is="dom-repeat" items="[[forecast]]">
                <div>
                  <div class="weekday">[[computeDate(item.datetime)]]
                    <template is="dom-if" if="[[!item.templow]]">
                      <br>[[computeTime(item.datetime)]]</br>
                    </template>
                  </div>
                  <template is="dom-if" if="[[item.condition]]">
                    <div class="icon">
                      <iron-icon icon="[[getWeatherIcon(item.condition)]]"></iron-icon>
                    </div>
                  </template>
                  <div class="temp">[[item.temperature]] [[getUnit('temperature')]]</div>
                  <template is="dom-if" if="[[_showValue(item.templow)]]">
                    <div class="templow">[[item.templow]] [[getUnit('temperature')]]</div>
                  </template>
                  <template is="dom-if" if="[[_showValue(item.precipitation)]]">
                    <div class="precipitation">[[item.precipitation]] [[getUnit('precipitation')]]</div>
                  </template>
                </div>
              </template>
            </div>
          </template>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      forecast: {
        type: Array,
        computed: 'computeForecast(stateObj.attributes.forecast)'
      }
    };
  }

  constructor() {
    super();
    this.cardinalDirections = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N'
    ];
    this.weatherIcons = {
      'clear-night': 'hass:weather-night',
      cloudy: 'hass:weather-cloudy',
      fog: 'hass:weather-fog',
      hail: 'hass:weather-hail',
      lightning: 'mid:weather-lightning',
      'lightning-rainy': 'hass:weather-lightning-rainy',
      partlycloudy: 'hass:weather-partlycloudy',
      pouring: 'hass:weather-pouring',
      rainy: 'hass:weather-rainy',
      snowy: 'hass:weather-snowy',
      'snowy-rainy': 'hass:weather-snowy-rainy',
      sunny: 'hass:weather-sunny',
      windy: 'hass:weather-windy',
      'windy-variant': 'hass:weather-windy-variant'
    };
  }

  ready() {
    this.addEventListener('click', this._onClick);
    super.ready();
  }

  _onClick() {
    this.fire('hass-more-info', { entityId: this.stateObj.entity_id });
  }

  computeForecast(forecast) {
    return forecast && forecast.slice(0, 5);
  }

  getUnit(measure) {
    if (measure === 'precipitation') {
      return this.getUnit('length') === 'km' ? 'mm' : 'in';
    }
    return this.hass.config.core.unit_system[measure] || '';
  }

  computeState(state, localize) {
    return localize(`state.weather.${state.replace('-', '_')}`) || state;
  }

  showWeatherIcon(condition) {
    return condition in this.weatherIcons;
  }

  getWeatherIcon(condition) {
    return this.weatherIcons[condition];
  }

  windBearingToText(degree) {
    const degreenum = parseInt(degree);
    if (isFinite(degreenum)) {
      return this.cardinalDirections[(((degreenum + 11.25) / 22.5) | 0) % 16];
    }
    return degree;
  }

  getWind(speed, bearing, localize) {
    if (bearing != null) {
      const cardinalDirection = this.windBearingToText(bearing);
      return `${speed} ${this.getUnit('length')}/h (${localize(`ui.card.weather.cardinal_direction.${cardinalDirection.toLowerCase()}`) || cardinalDirection})`;
    }
    return `${speed} ${this.getUnit('length')}/h`;
  }

  _showValue(item) {
    return typeof item !== 'undefined' && item !== null;
  }

  computeDate(data) {
    const date = new Date(data);
    return date.toLocaleDateString(
      this.hass.selectedLanguage || this.hass.language,
      { weekday: 'short' }
    );
  }

  computeTime(data) {
    const date = new Date(data);
    return date.toLocaleTimeString(
      this.hass.selectedLanguage || this.hass.language,
      { hour: 'numeric' }
    );
  }
}
customElements.define('ha-weather-card', HaWeatherCard);
