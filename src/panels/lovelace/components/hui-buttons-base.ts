import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  css,
  CSSResult,
  queryAll,
} from "lit-element";
import "@material/mwc-ripple";

import "../../../components/entity/state-badge";
import "../../../components/ha-icon";

import { HomeAssistant } from "../../../types";
import { EntityConfig } from "../entity-rows/types";
import { toggleEntity } from "../common/entity/toggle-entity";
import { computeTooltip } from "../common/compute-tooltip";
// tslint:disable-next-line: no-duplicate-imports
import { StateBadge } from "../../../components/entity/state-badge";

@customElement("hui-buttons-base")
export class HuiButtonsBase extends LitElement {
  public static getStubConfig(): object {
    return { entities: [] };
  }

  protected _configEntities?: EntityConfig[];
  protected _hass?: HomeAssistant;
  @queryAll("state-badge") protected _badges!: StateBadge[];

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this._badges.forEach((badge, index: number) => {
      badge.hass = hass;
      badge.stateObj = hass.states[this._configEntities![index].entity];
    });
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
              title=${computeTooltip(this._hass!, entityConf)}
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
    "hui-buttons-base": HuiButtonsBase;
  }
}
