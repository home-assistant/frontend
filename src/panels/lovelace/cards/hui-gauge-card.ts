import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { LovelaceCard, LovelaceConfig } from "../types.js";
import { HomeAssistant } from "../../../types.js";
import isValidEntityId from "../../../common/entity/valid_entity_id.js";
import { fireEvent } from "../../../common/dom/fire_event.js";

import "../../../components/ha-card.js";

interface Config extends LovelaceConfig {
  entity: string;
  title?: string;
  unit_of_measurement?: string;
  min?: number;
  max?: number;
  severity?: object;
}

class HuiGaugeCard extends LitElement implements LovelaceCard {
  public hass?: HomeAssistant;
  private _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public getCardSize() {
    return 1;
  }

  public setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Invalid card configuration");
    }
    if (!isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }
    this._config = { min: 0, max: 100, ...config };
  }

  protected render() {
    if (!this._config) {
      return html``;
    }
    const stateObj = this.hass!.states[this._config.entity];

    return html`
    ${this.renderStyle()}
    <ha-card  @click="${this._handleClick}">
    ${
      !stateObj
        ? html`<div class="not-found">Entity not available: ${
            this._config.entity
          }</div>`
        : html`
          <div class='container'>
            <div class='gauge-a'></div>
            <div class='gauge-b'></div>
            <div class='gauge-c' id='gauge'></div>
            <div class='gauge-data'>
              <div id='percent'>${stateObj.state}</div>
              <div id='title'>${this._config.title}
                ${this._config!.unit_of_measurement ||
                  stateObj.attributes.unit_of_measurement ||
                  ""}
              </div>
            </div>
          </div>
        `
    }
    </ha-card>
    `;
  }

  protected shouldUpdate(changedProps) {
    if (changedProps.get("hass")) {
      return (
        changedProps.get("hass").states[this._config!.entity] !==
        this.hass!.states[this._config!.entity]
      );
    }
    return changedProps;
  }

  protected firstUpdated() {
    const stateObj = this.hass!.states[this._config!.entity];

    if (isNaN(Number(stateObj.state))) {
      this.shadowRoot!.querySelector("title")!.classList.add("not-found");
      this.shadowRoot!.querySelector("title")!.innerHTML =
        "Entity is non-numeric: " + this._config!.entity;
    }
  }

  protected updated() {
    const stateObj = this.hass!.states[this._config!.entity];
    const turn = this._translateTurn(stateObj.state, this._config);

    this.shadowRoot!.getElementById(
      "gauge"
    )!.style.transform = `rotate(${turn}turn)`;

    this.shadowRoot!.getElementById(
      "gauge"
    )!.style.backgroundColor = this._computeSeverity(
      stateObj.state,
      this._config!.severity
    );

    if (this.clientWidth < 200) {
      (this.shadowRoot!.querySelector(
        "ha-card"
      )! as HTMLElement).style.setProperty(
        "--base-unit",
        this.clientWidth / 5 + "px"
      );
    }
  }

  private renderStyle() {
    return html`
      <style>
        ha-card {
          --base-unit: 50px;
          height: calc(var(--base-unit)*3);
          position: relative;
          cursor: pointer;
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
    `;
  }

  private _computeSeverity(stateValue, sections) {
    const numberValue = Number(stateValue);
    const severityMap = {
      red: "var(--label-badge-red)",
      green: "var(--label-badge-green)",
      yellow: "var(--label-badge-yellow)",
      normal: "var(--label-badge-blue)",
    };

    if (!sections) {
      return severityMap.normal;
    }

    const sectionsArray = Object.keys(sections);
    const sortable = sectionsArray.map((severity) => [
      severity,
      sections[severity],
    ]);

    for (const severity of sortable) {
      if (severityMap[severity[0]] == null || isNaN(severity[1])) {
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

  private _translateTurn(value, config) {
    const maxTurnValue = Math.min(Math.max(value, config.min), config.max);
    return (5 * (maxTurnValue - config.min)) / (config.max - config.min) / 10;
  }

  private _handleClick() {
    fireEvent(this, "hass-more-info", { entityId: this._config!.entity });
  }
}

customElements.define("hui-gauge-card", HuiGaugeCard);
