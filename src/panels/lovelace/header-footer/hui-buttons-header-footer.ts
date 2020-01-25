import {
  html,
  LitElement,
  TemplateResult,
  customElement,
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
import { EntityConfig } from "../entity-rows/types";
import { processConfigEntities } from "../common/process-config-entities";
import { toggleEntity } from "../common/entity/toggle-entity";

@customElement("hui-buttons-header-footer")
export class HuiGlanceCard extends LitElement implements LovelaceHeaderFooter {
  public static getStubConfig(): object {
    return { entities: [] };
  }

  private _configEntities?: EntityConfig[];
  private _hass?: HomeAssistant;

  public setConfig(config: ButtonsHeaderFooterConfig): void {
    this._configEntities = processConfigEntities(config.entities);
    this.requestUpdate();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.shadowRoot!.querySelectorAll("state-badge").forEach(
      (badge, index: number) => {
        badge.hass = hass;
        badge.stateObj = hass.states[this._configEntities![index].entity];
      }
    );
  }

  protected render(): TemplateResult | void {
    return html`
      ${(this._configEntities || []).map((entityConf) => {
        const stateObj = this._hass!.states[entityConf.entity];
        if (!stateObj) {
          return html`<div class='missing'><iron-icon icon="hass:alert"></div>`;
        }

        return html`
          <div>
            <state-badge
              .title=${computeTooltip(this.hass, entityConf)}
              @click=${this._toggle}
              .hass=${this._hass}
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
    await toggleEntity(this._hass!, ev.target.stateObj.entity_id);
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
