import type { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { stateActive } from "../common/entity/state_active";
import { computeRTL } from "../common/util/compute_rtl";
import "../components/entity/state-info";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";

@customElement("state-card-alert")
export class StateCardAlert extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  // property used only in CSS
  @property({ type: Boolean, reflect: true }) public rtl = false;

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

  protected updated(changedProps) {
    super.updated(changedProps);
    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.language !== this.hass.language) {
      this.rtl = computeRTL(this.hass);
    }
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
          direction: ltr;
        }
        ha-entity-toggle {
          margin: -4px -16px -4px 0;
          padding: 4px 16px;
        }
      `,
    ];
  }
}
