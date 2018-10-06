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
          background-color: var(--label-badge-yellow);
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
      </style>
      <ha-card on-click='_handleClick'>
        <div class='container'>
          <div class='gauge-a'></div>
          <div class='gauge-b'></div>
          <div class='gauge-c' id='gauge'></div>
          <div class='gauge-data'><div id='percent'></div><div id='title'></div></div>
        </div>
      </ha-card>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: '_hassChanged'
      },
      _config: Object,
    };
  }

  ready() {
    super.ready();
    if (this._config) this._buildConfig();
  }

  getCardSize() {
    return 1;
  }

  setConfig(config) {
    this._config = Object.assign({ min: 0, max: 100 }, config);
    if (!config || !config.entity) throw new Error('Invalid card configuration');

    if (this.$) this._buildConfig();
    if (this.hass) this._hassChanged(this.hass);
  }

  _buildConfig() {
    const entityStateObj = this.hass.states[this._config.entity];
    const unitOfMeasurement = this._config.unit_of_measurement || entityStateObj.attributes.unit_of_measurement || '';
    const root = this.shadowRoot;

    if (!this.entityStateObj || entityStateObj.state !== this._entityState.state) {
      root.getElementById('percent').textContent = `${entityStateObj.state} ${unitOfMeasurement}`;
      root.getElementById('title').textContent = this._config.title;
      const turn = this._translateTurn(entityStateObj.state, this._config) / 10;
      root.getElementById('gauge').style.transform = `rotate(${turn}turn)`;
      root.getElementById('gauge').style.backgroundColor = this._computeSeverity(entityStateObj.state, this._config.severity);
      this._entityStateObj = entityStateObj;
    }
  }

  _hassChanged(hass) {
    this.hass = hass;
    this._buildConfig();
  }

  _computeSeverity(stateValue, sections) {
    const numberValue = Number(stateValue);
    const severityMap = {
      red: 'var(--label-badge-red)',
      green: 'var(--label-badge-green)',
      amber: 'var(--label-badge-yellow)',
      normal: 'var(--label-badge-blue)',
    };
    if (!sections) return severityMap.normal;
    const sortable = [];
    Object.keys(sections).forEach((severity) => {
      sortable.push([severity, sections[severity]]);
    });
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

  _computeClasses(hasHeader) {
    return `entities ${hasHeader ? '' : 'no-header'}`;
  }

  _handleClick() {
    const entityId = this._config.entity;
    this.fire('hass-more-info', { entityId });
  }
}

customElements.define('hui-gauge-card', HuiGaugeCard);
