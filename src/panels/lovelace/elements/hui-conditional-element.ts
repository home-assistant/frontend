import { html, LitElement, TemplateResult } from "lit-element";

import "../../../components/entity/ha-state-label-badge";

import { createHuiElement } from "../common/create-hui-element";

import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { Condition } from "../../../data/lovelace";

interface Config extends LovelaceElementConfig {
  conditions: Condition[];
  elements: LovelaceElementConfig[];
}

class HuiConditionalElement extends LitElement implements LovelaceElement {
  public hass?: HomeAssistant;
  private _config?: Config;

  static get properties() {
    return { hass: {}, _config: {} };
  }

  public setConfig(config: Config): void {
    if (
      !config.conditions ||
      !Array.isArray(config.conditions) ||
      !config.elements ||
      !Array.isArray(config.elements) ||
      !config.conditions.every(
        (c) => ((c.entity && (c.state || c.state_not)) as unknown) as boolean
      )
    ) {
      throw new Error("Error in card configuration.");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      ${this._config.elements.map((elementConfig: LovelaceElementConfig) => {
        const el = this._createHuiElement(elementConfig);

        el.style.display = this._evalConditions() ? "block" : "none";

        return el;
      })}
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
          position: absolute;
          left: 0px;
          top: 0px;
          width: 100%;
          height: 100%;
          transform: none !important;
        }

        .element {
          position: absolute;
          transform: translate(-50%, -50%);
        }
      </style>
    `;
  }

  private _createHuiElement(
    elementConfig: LovelaceElementConfig
  ): LovelaceElement {
    const element = createHuiElement(elementConfig) as LovelaceElement;
    element.hass = this.hass;
    element.classList.add("element");

    Object.keys(elementConfig.style).forEach((prop) => {
      element.style.setProperty(prop, elementConfig.style[prop]);
    });

    return element;
  }

  private _evalConditions(): boolean {
    return this._config!.conditions.every((c) => {
      if (!(c.entity in this.hass!.states)) {
        return false;
      }
      if (c.state) {
        return this.hass!.states[c.entity].state === c.state;
      }
      return this.hass!.states[c.entity].state !== c.state_not;
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-element": HuiConditionalElement;
  }
}

customElements.define("hui-conditional-element", HuiConditionalElement);
