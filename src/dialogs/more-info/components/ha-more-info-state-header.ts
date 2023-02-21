import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, TemplateResult, css, CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { isUnavailableState } from "../../../data/entity";
import { LightEntity } from "../../../data/light";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../../../data/sensor";
import "../../../panels/lovelace/components/hui-timestamp-display";
import { HomeAssistant } from "../../../types";

@customElement("ha-more-info-state-header")
export class HaMoreInfoStateHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @property({ attribute: false }) public stateOverride?: string;

  private _computeStateDisplay(stateObj: HassEntity): TemplateResult | string {
    if (
      stateObj.attributes.device_class === SENSOR_DEVICE_CLASS_TIMESTAMP &&
      !isUnavailableState(stateObj.state)
    ) {
      return html`
        <hui-timestamp-display
          .hass=${this.hass}
          .ts=${new Date(stateObj.state)}
          format="relative"
          capitalize
        ></hui-timestamp-display>
      `;
    }

    const stateDisplay = computeStateDisplay(
      this.hass!.localize,
      stateObj,
      this.hass!.locale,
      this.hass!.entities
    );

    return stateDisplay;
  }

  protected render(): TemplateResult {
    const name = this.stateObj.attributes.friendly_name;

    const stateDisplay =
      this.stateOverride ?? this._computeStateDisplay(this.stateObj);

    return html`
      <p class="name">${name}</p>
      <p class="state">${stateDisplay}</p>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      p {
        text-align: center;
        margin: 0;
      }
      .name {
        font-style: normal;
        font-weight: 400;
        font-size: 28px;
        line-height: 36px;
        margin-bottom: 4px;
      }
      .state {
        font-style: normal;
        font-weight: 500;
        font-size: 16px;
        line-height: 24px;
        letter-spacing: 0.1px;
        margin-bottom: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-state-header": HaMoreInfoStateHeader;
  }
}
