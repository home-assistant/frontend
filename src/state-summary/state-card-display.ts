import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { computeRTL } from "../common/util/compute_rtl";
import "../components/entity/state-info";
import { UNAVAILABLE_STATES } from "../data/entity";
import "../panels/lovelace/components/hui-timestamp-display";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";

@customElement("state-card-display")
export class StateCardDisplay extends LitElement {
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
        <div
          class="state ${classMap({
            "has-unit_of_measurement":
              "unit_of_measurement" in this.stateObj.attributes,
          })}"
        >
          ${computeDomain(this.stateObj.entity_id) === "sensor" &&
          this.stateObj.attributes.device_class === "timestamp" &&
          !UNAVAILABLE_STATES.includes(this.stateObj.state)
            ? html` <hui-timestamp-display
                .hass=${this.hass}
                .ts=${new Date(this.stateObj.state)}
                format="datetime"
              ></hui-timestamp-display>`
            : computeStateDisplay(
                this.hass!.localize,
                this.stateObj,
                this.hass.language
              )}
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

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host([rtl]) {
          direction: rtl;
          text-align: right;
        }

        state-info {
          flex: 1 1 auto;
          min-width: 0;
        }
        .state {
          color: var(--primary-text-color);
          margin-left: 16px;
          text-align: right;
          flex: 0 0 auto;
          overflow-wrap: break-word;
        }
        :host([rtl]) .state {
          margin-right: 16px;
          margin-left: 0;
          text-align: left;
        }

        .state.has-unit_of_measurement {
          white-space: nowrap;
        }
      `,
    ];
  }
}
