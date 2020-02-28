import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  css,
  CSSResult,
  queryAll,
  property,
} from "lit-element";
import "@material/mwc-ripple";

import "../../../components/entity/state-badge";
import "../../../components/ha-icon";

import { HomeAssistant } from "../../../types";
import { computeTooltip } from "../common/compute-tooltip";
// tslint:disable-next-line: no-duplicate-imports
import { StateBadge } from "../../../components/entity/state-badge";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { handleAction } from "../common/handle-action";
import { EntitiesCardEntityConfig } from "../cards/types";

@customElement("hui-buttons-base")
export class HuiButtonsBase extends LitElement {
  @property() public configEntities?: EntitiesCardEntityConfig[];
  @queryAll("state-badge") protected _badges!: StateBadge[];
  private _hass?: HomeAssistant;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this._badges.forEach((badge, index: number) => {
      badge.hass = hass;
      badge.stateObj = hass.states[this.configEntities![index].entity];
    });
  }

  protected render(): TemplateResult | void {
    return html`
      ${(this.configEntities || []).map((entityConf) => {
        const stateObj = this._hass!.states[entityConf.entity];
        if (!stateObj) {
          return html`<div class='missing'><iron-icon icon="hass:alert"></div>`;
        }

        return html`
          <div>
            <state-badge
              title=${computeTooltip(this._hass!, entityConf)}
              @action=${this._handleAction}
              .actionHandler=${actionHandler({
                hasHold: hasAction(entityConf.hold_action),
                hasDoubleClick: hasAction(entityConf.double_tap_action),
              })}
              .config=${entityConf}
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

  private _handleAction(ev: ActionHandlerEvent) {
    const config = (ev.currentTarget as any).config as EntitiesCardEntityConfig;
    handleAction(
      this,
      this._hass!,
      { tap_action: { action: "toggle" }, ...config },
      ev.detail.action!
    );
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
