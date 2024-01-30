import "@material/mwc-button";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { HassEntity } from "home-assistant-js-websocket";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";

const STATES_INTERCEPTABLE: {
  [state: string]: {
    action:
      | "return_to_base"
      | "start_cleaning"
      | "turn_on"
      | "turn_off"
      | "resume_cleaning";
    service: string;
  };
} = {
  cleaning: {
    action: "return_to_base",
    service: "return_to_base",
  },
  docked: {
    action: "start_cleaning",
    service: "start",
  },
  idle: {
    action: "start_cleaning",
    service: "start",
  },
  off: {
    action: "turn_on",
    service: "turn_on",
  },
  on: {
    action: "turn_off",
    service: "turn_off",
  },
  paused: {
    action: "resume_cleaning",
    service: "start",
  },
};

@customElement("ha-vacuum-state")
export class HaVacuumState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  protected render(): TemplateResult {
    const interceptable = this._computeInterceptable(
      this.stateObj.state,
      this.stateObj.attributes.supported_features
    );
    return html`
      <mwc-button @click=${this._callService} .disabled=${!interceptable}>
        ${this._computeLabel(this.stateObj.state, interceptable)}
      </mwc-button>
    `;
  }

  private _computeInterceptable(
    state: string,
    supportedFeatures: number | undefined
  ) {
    return state in STATES_INTERCEPTABLE && supportedFeatures !== 0;
  }

  private _computeLabel(state: string, interceptable: boolean) {
    return interceptable
      ? this.hass.localize(
          `ui.card.vacuum.actions.${STATES_INTERCEPTABLE[state].action}`
        )
      : this.hass.localize(
          `component.vacuum.entity_component._.state.${state}`
        );
  }

  private async _callService(ev) {
    ev.stopPropagation();
    const stateObj = this.stateObj;
    const service = STATES_INTERCEPTABLE[stateObj.state].service;
    await this.hass.callService("vacuum", service, {
      entity_id: stateObj.entity_id,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        mwc-button {
          top: 3px;
          height: 37px;
          margin-right: -0.57em;
          margin-inline-end: -0.57em;
          margin-inline-start: initial;
        }
        mwc-button[disabled] {
          background-color: transparent;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-vacuum-state": HaVacuumState;
  }
}
