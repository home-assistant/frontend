import type { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { stateActive } from "../common/entity/state_active";
import "../components/entity/ha-entity-toggle";
import "../components/entity/state-info";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";

@customElement("state-card-alert")
class StateCardAlert extends LitElement {
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
        >
        </state-info>
        <div class="state">
          ${stateActive(this.stateObj)
            ? html`<ha-entity-toggle
                .hass=${this.hass}
                .stateObj=${this.stateObj}
              ></ha-entity-toggle>`
            : this.hass.formatEntityState(this.stateObj)}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        state-info {
          flex: 1 1 auto;
          min-width: 0;
        }
        .state {
          color: var(--primary-text-color);
          margin-inline-start: 16px;
          margin-inline-end: initial;
          text-align: var(--float-end, right);
          flex: 0 0 auto;
          overflow-wrap: break-word;
          display: flex;
          align-items: center;
        }
        ha-entity-toggle {
          margin: -4px -16px -4px 0;
          margin-inline-start: 0;
          margin-inline-end: -16px;
          padding: 4px 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-alert": StateCardAlert;
  }
}
