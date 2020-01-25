import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import "@material/mwc-ripple";

import "../../../components/entity/state-badge";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../components/hui-warning-element";

import { HomeAssistant } from "../../../types";
import { LovelaceHeaderFooter } from "../types";
import { ButtonsHeaderFooterConfig } from "./types";
import { turnOnOffEntity } from "../common/entity/turn-on-off-entity";
import { EntityConfig } from "../entity-rows/types";
import { processConfigEntities } from "../common/process-config-entities";

@customElement("hui-buttons-header-footer")
export class HuiGlanceCard extends LitElement implements LovelaceHeaderFooter {
  public static getStubConfig(): object {
    return { entities: [] };
  }

  @property() public hass?: HomeAssistant;

  @property() private _config?: ButtonsHeaderFooterConfig;

  private _configEntities?: EntityConfig[];

  public setConfig(config: ButtonsHeaderFooterConfig): void {
    if (!config || !Array.isArray(config.entities)) {
      throw new Error("Entities needs to be a list of entity IDs");
    }
    this._config = config;
    this._configEntities = processConfigEntities(config.entities);

    if (this.hass) {
      this.requestUpdate();
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      !oldHass ||
      oldHass.themes !== this.hass!.themes ||
      oldHass.language !== this.hass!.language
    ) {
      return true;
    }

    for (const entity of this._configEntities!) {
      if (oldHass.states[entity.entity] !== this.hass!.states[entity.entity]) {
        return true;
      }
    }

    return false;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      ${this._configEntities!.map((entityConf) => {
        const stateObj = this.hass!.states[entityConf.entity];
        if (!stateObj) {
          return html`<div class='missing'><iron-icon icon="hass:alert"></div>`;
        }

        return html`
          <div>
            <state-badge
              @click=${this._toggle}
              .hass=${this.hass}
              .stateObj=${stateObj}
              .overrideIcon=${entityConf.icon}
              .overrideImage=${entityConf.image}
              stateColor
              tabindex="0"
            ></state-badge>
            <mwc-ripple unbounded></mwc-ripple>
          </div>
        `;
      })}
    `;
  }

  private async _toggle(ev) {
    await turnOnOffEntity(this.hass!, ev.target.stateObj.entity_id);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        justify-content: space-evenly;
      }
      .missing {
        color: #fce588;
      }
      state-badge {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-buttons-header-footer": HuiGlanceCard;
  }
}
