import '@polymer/iron-icon/iron-icon.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class MoreInfoWeather extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      iron-icon {
        color: var(--paper-item-icon-color);
      }
      .section {
        margin: 16px 0 8px 0;
        font-size: 1.2em;
      }

      .flex {
        display: flex;
        height: 32px;
        align-items: center;
      }

      .main {
        flex: 1;
        margin-left: 24px;
      }

      .temp,
      .templow {
        min-width: 48px;
        text-align: right;
      }

      .templow {
        margin: 0 16px;
        color: var(--secondary-text-color);
      }

      .attribution {
        color: var(--secondary-text-color);
        text-align: center;
      }
    </style>

    <div class="flex">
      <iron-icon icon="hass:thermometer"></iron-icon>
      <div class="main">[[localize('ui.card.weather.attributes.temperature')]]</div>
      <div>[[stateObj.attributes.temperature]] [[getUnit('temperature')]]</div>
    </div>
    <template is="dom-if" if="[[stateObj.attributes.pressure]]">
      <div class="flex">
        <iron-icon icon="hass:gauge"></iron-icon>
        <div class="main">[[localize('ui.card.weather.attributes.air_pressure')]]</div>
        <div>[[stateObj.attributes.pressure]] [[getUnit('air_pressure')]]</div>
      </div>
    </template>
    <template is="dom-if" if="[[stateObj.attributes.humidity]]">
      <div class="flex">
        <iron-icon icon="hass:water-percent"></iron-icon>
        <div class="main">[[localize('ui.card.weather.attributes.humidity')]]</div>
        <div>[[stateObj.attributes.humidity]] %</div>
      </div>
    </template>
    <template is="dom-if" if="[[stateObj.attributes.wind_speed]]">
      <div class="flex">
        <iron-icon icon="hass:weather-windy"></iron-icon>
        <div class="main">[[localize('ui.card.weather.attributes.wind_speed')]]</div>
        <div>[[getWind(stateObj.attributes.wind_speed, stateObj.attributes.wind_bearing, localize)]]</div>
      </div>
    </template>
    <template is="dom-if" if="[[stateObj.attributes.visibility]]">
      <div class="flex">
        <iron-icon icon="hass:eye"></iron-icon>
        <div class="main">[[localize('ui.card.weather.attributes.visibility')]]</div>
        <div>[[stateObj.attributes.visibility]] [[getUnit('length')]]</div>
      </div>
    </template>

    <template is="dom-if" if="[[stateObj.attributes.forecast]]">
      <div class="section">[[localize('ui.card.weather.forecast')]]:</div>
      <template is="dom-repeat" items="[[stateObj.attributes.forecast]]">
        <div class="flex">
          <template is="dom-if" if="[[item.condition]]">
            <iron-icon icon="[[getWeatherIcon(item.condition)]]"></iron-icon>
          </template>
          <div class="main">[[computeDateTime(item.datetime)]]</div>
          <template is="dom-if" if="[[item.templow]]">
            <div class="templow">[[item.templow]] [[getUnit('temperature')]]</div>
          </template>
          <div class="temp">[[item.temperature]] [[getUnit('temperature')]]</div>
        </div>
      </template>
    </template>

    <template is="dom-if" if="stateObj.attributes.attribution">
      <div class="attribution">[[stateObj.attributes.attribution]]</div>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object
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

  computeDateTime(data) {
    const date = new Date(data);
    const provider = this.stateObj.attributes.attribution;
    if (provider === 'Powered by Dark Sky' || provider === 'Data provided by OpenWeatherMap') {
      if (new Date().getDay() === date.getDay()) {
        return date.toLocaleTimeString(
          this.hass.selectedLanguage || this.hass.language,
          { hour: 'numeric' }
        );
      }
      return date.toLocaleDateString(
        this.hass.selectedLanguage || this.hass.language,
        { weekday: 'long', hour: 'numeric' }
      );
    }
    return date.toLocaleDateString(
      this.hass.selectedLanguage || this.hass.language,
      { weekday: 'long', month: 'short', day: 'numeric' }
    );
  }

  getUnit(measure) {
    const lengthUnit = this.hass.config.core.unit_system.length || '';
    switch (measure) {
      case 'air_pressure':
        return lengthUnit === 'km' ? 'hPa' : 'inHg';
      case 'length':
        return lengthUnit;
      case 'precipitation':
        return lengthUnit === 'km' ? 'mm' : 'in';
      default:
        return this.hass.config.core.unit_system[measure] || '';
    }
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

  getWeatherIcon(condition) {
    return this.weatherIcons[condition];
  }
}

customElements.define('more-info-weather', MoreInfoWeather);
