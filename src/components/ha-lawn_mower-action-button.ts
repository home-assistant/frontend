import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { supportsFeature } from "../common/entity/supports-feature";
import "./ha-button";
import type { LawnMowerEntity, LawnMowerEntityState } from "../data/lawn_mower";
import { LawnMowerEntityFeature } from "../data/lawn_mower";
import type { HomeAssistant } from "../types";

interface LawnMowerAction {
  action: string;
  service: string;
  feature: LawnMowerEntityFeature;
}

const LAWN_MOWER_ACTIONS: Partial<
  Record<LawnMowerEntityState, LawnMowerAction>
> = {
  mowing: {
    action: "dock",
    service: "dock",
    feature: LawnMowerEntityFeature.DOCK,
  },
  docked: {
    action: "start_mowing",
    service: "start_mowing",
    feature: LawnMowerEntityFeature.START_MOWING,
  },
  returning: {
    action: "pause",
    service: "pause",
    feature: LawnMowerEntityFeature.PAUSE,
  },
  paused: {
    action: "resume_mowing",
    service: "start_mowing",
    feature: LawnMowerEntityFeature.START_MOWING,
  },
};

@customElement("ha-lawn_mower-action-button")
class HaLawnMowerActionButton extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LawnMowerEntity;

  public render() {
    const state = this.stateObj.state;
    const action = LAWN_MOWER_ACTIONS[state];

    if (action && supportsFeature(this.stateObj, action.feature)) {
      return html`
        <ha-button
          appearance="plain"
          @click=${this.callService}
          .service=${action.service}
          size="small"
        >
          ${this.hass.localize(`ui.card.lawn_mower.actions.${action.action}`)}
        </ha-button>
      `;
    }

    return html`
      <ha-button appearance="plain" disabled>
        ${this.hass.formatEntityState(this.stateObj)}
      </ha-button>
    `;
  }

  callService(ev) {
    ev.stopPropagation();
    const stateObj = this.stateObj;
    const service = ev.target.service;
    this.hass.callService("lawn_mower", service, {
      entity_id: stateObj.entity_id,
    });
  }

  static styles = css`
    ha-button {
      top: 3px;
      height: 37px;
      margin-right: -0.57em;
      margin-inline-end: -0.57em;
      margin-inline-start: initial;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-lawn_mower-action-button": HaLawnMowerActionButton;
  }
}
