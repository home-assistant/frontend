import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-card.js';

import EventsMixin from '../../../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HuiGaugeCard extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        ha-card {
          --base-unit: 50px;
          height: calc(var(--base-unit)*3);
          position: relative;
        }
        .container{
          width: calc(var(--base-unit) * 4);
          height: calc(var(--base-unit) * 2);
          position: absolute;
          top: calc(var(--base-unit)*1.5);
          left: 50%;
          overflow: hidden;
          text-align: center;
          transform: translate(-50%, -50%);
        }
        .gauge-a{
          z-index: 1;
          position: absolute;
          background-color: var(--primary-background-color);
          width: calc(var(--base-unit) * 4);
          height: calc(var(--base-unit) * 2);
          top: 0%;
          border-radius:calc(var(--base-unit) * 2.5) calc(var(--base-unit) * 2.5) 0px 0px ;
        }
        .gauge-b{
          z-index: 3;
          position: absolute;
          background-color: var(--paper-card-background-color);
          width: calc(var(--base-unit) * 2.5);
          height: calc(var(--base-unit) * 1.25);
          top: calc(var(--base-unit) * 0.75);
          margin-left: calc(var(--base-unit) * 0.75);
          margin-right: auto;
          border-radius: calc(var(--base-unit) * 2.5) calc(var(--base-unit) * 2.5) 0px 0px ;
        }
        .gauge-c{
          z-index: 2;
          position: absolute;
          background-color: var(--label-badge-blue);
          width: calc(var(--base-unit) * 4);
          height: calc(var(--base-unit) * 2);
          top: calc(var(--base-unit) * 2);
          margin-left: auto;
          margin-right: auto;
          border-radius: 0px 0px calc(var(--base-unit) * 2) calc(var(--base-unit) * 2) ;
          transform-origin: center top;
          transition: all 1.3s ease-in-out;
        }
        .gauge-data{
          z-index: 4;
          color: var(--primary-text-color);
          line-height: calc(var(--base-unit) * 0.3);
          position: absolute;
          width: calc(var(--base-unit) * 4);
          height: calc(var(--base-unit) * 2.1);
          top: calc(var(--base-unit) * 1.2);
          margin-left: auto;
          margin-right: auto;
          transition: all 1s ease-out;
        }
        .gauge-data #percent{
          font-size: calc(var(--base-unit) * 0.55);
        }
        .gauge-data #title{
          padding-top: calc(var(--base-unit) * 0.15);
          font-size: calc(var(--base-unit) * 0.30);
        }
        .not-found {
          flex: 1;
          background-color: yellow;
          padding: 8px;
        }
      </style>
      <ha-card  on-click='_handleClick'>
        <div class='container'>
          <div class='gauge-a'></div>
          <div class='gauge-b'></div>
          <div class='gauge-c' id='gauge'></div>
          <div class='gauge-data'>
            <div id='percent'>[[_computeStateDisplay(_stateObj)]]</div>
            <div id='title'>[[_computeTitle(_stateObj)]]</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object
      },
      _config: Object,
      _stateObj: {
        type: Object,
        computed: '_computeStateObj(hass.states, _config.entity)',
        observer: '_stateObjChanged'
      },
    };
  }

  ready() {
    super.ready();
  }

  getCardSize() {
    return 1;
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error('Invalid card configuration');

    this._config = Object.assign({ min: 0, max: 100 }, config);
  }

  _computeStateObj(states, entityId) {
    return states && entityId in states ? states[entityId] : null;
  }

  _stateObjChanged(stateObj) {
    if (!stateObj) return;
    const config = this._config;

    const turn = this._translateTurn(stateObj.state, config) / 10;
    this.$.gauge.style.transform = `rotate(${turn}turn)`;
    this.$.gauge.style.backgroundColor = this._computeSeverity(stateObj.state, config.severity);
  }

  _computeStateDisplay(stateObj) {
    if (!stateObj || isNaN(stateObj.state)) return null;
    const unitOfMeasurement = this._config.unit_of_measurement || stateObj.attributes.unit_of_measurement || '';
    return `${stateObj.state} ${unitOfMeasurement}`;
  }

  _computeTitle(stateObj) {
    if (!stateObj) {
      this.$.title.className = 'not-found';
      return 'Entity not available: ' + this._config.entity;
    }
    if (isNaN(stateObj.state)) {
      this.$.title.className = 'not-found';
      return 'Entity is non-numeric: ' + this._config.entity;
    }
    return this._config.title;
  }

  _computeSeverity(stateValue, sections) {
    const numberValue = Number(stateValue);
    const severityMap = {
      red: 'var(--label-badge-red)',
      green: 'var(--label-badge-green)',
      yellow: 'var(--label-badge-yellow)',
      normal: 'var(--label-badge-blue)',
    };
    if (!sections) return severityMap.normal;
    const sectionsArray = Object.keys(sections);

    const sortable = sectionsArray.map(severity => [severity, sections[severity]]);
    for (var i = 0; i < sortable.length; i++) {
      if (severityMap[sortable[i][0]] == null || isNaN(sortable[i][1])) {
        return severityMap.normal;
      }
    }
    sortable.sort((a, b) => a[1] - b[1]);

    if (numberValue >= sortable[0][1] && numberValue < sortable[1][1]) {
      return severityMap[sortable[0][0]];
    }
    if (numberValue >= sortable[1][1] && numberValue < sortable[2][1]) {
      return severityMap[sortable[1][0]];
    }
    if (numberValue >= sortable[2][1]) {
      return severityMap[sortable[2][0]];
    }
    return severityMap.normal;
  }

  _translateTurn(value, config) {
    return 5 * (value - config.min) / (config.max - config.min);
  }

  _handleClick() {
    this.fire('hass-more-info', { entityId: this._config.entity });
  }
}

customElements.define('hui-gauge-card', HuiGaugeCard);
