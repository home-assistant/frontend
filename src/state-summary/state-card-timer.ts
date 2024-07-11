import type { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/state-info";
import { haStyle } from "../resources/styles";
import "../state-display/state-display-timer";
import { HomeAssistant } from "../types";

@customElement("state-card-timer")
class StateCardTimer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <div class="state">
          <state-display-timer
            .hass=${this.hass}
            .stateObj=${this.stateObj}
          ></state-display-timer>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .state {
          color: var(--primary-text-color);
          margin-left: 16px;
          margin-inline-start: 16px;
          margin-inline-end: initial;
          text-align: var(--float-end);
          line-height: 40px;
          white-space: nowrap;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-timer": StateCardTimer;
  }
}
