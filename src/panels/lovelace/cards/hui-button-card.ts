import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../../../components/ha-card";
import createHuiElement from "../common/create-hui-element";

import isValidEntityId from "../../../common/entity/valid_entity_id";
import { HomeAssistant } from "../../../types";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceCard } from "../types";
import { LovelaceCardConfig, ActionConfig } from "../../../data/lovelace";
import { LovelaceElement } from "../elements/types";

interface Config extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  theme?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

class HuiButtonCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public hass?: HomeAssistant;
  private _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public getCardSize(): number {
    return 2;
  }

  public setConfig(config: Config): void {
    if (!isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }

    this._config = { theme: "default", ...config };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (oldHass) {
      return (
        oldHass.states[this._config!.entity] !==
        this.hass!.states[this._config!.entity]
      );
    }
    return true;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const element = createHuiElement({
      type: "hui-button-element",
      ...this._config,
    }) as LovelaceElement;
    element.hass = this._hass;

    return html`
      ${element}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-card": HuiButtonCard;
  }
}

customElements.define("hui-button-card", HuiButtonCard);
