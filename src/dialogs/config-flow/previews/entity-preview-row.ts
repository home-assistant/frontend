import { HassEntity } from "home-assistant-js-websocket";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { isUnavailableState } from "../../../data/entity";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../../../data/sensor";
import { HomeAssistant } from "../../../types";

@customElement("entity-preview-row")
class EntityPreviewRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private stateObj?: HassEntity;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const stateObj = this.stateObj;
    return html`<state-badge
        .hass=${this.hass}
        .stateObj=${stateObj}
        stateColor
      ></state-badge>
      <div class="name" .title=${computeStateName(stateObj)}>
        ${computeStateName(stateObj)}
      </div>
      <div class="value">
        ${stateObj.attributes.device_class === SENSOR_DEVICE_CLASS_TIMESTAMP &&
        !isUnavailableState(stateObj.state)
          ? html`
              <hui-timestamp-display
                .hass=${this.hass}
                .ts=${new Date(stateObj.state)}
                capitalize
              ></hui-timestamp-display>
            `
          : this.hass.formatEntityState(stateObj)}
      </div>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        align-items: center;
        flex-direction: row;
      }
      .name {
        margin-left: 16px;
        margin-right: 8px;
        flex: 1 1 30%;
      }
      .value {
        direction: ltr;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-preview-row": EntityPreviewRow;
  }
}
