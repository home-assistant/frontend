import { HassEntity } from "home-assistant-js-websocket";
import { CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/ha-entity-toggle";
import "../components/entity/state-info";
import { HomeAssistant } from "../types";
import { isUnavailableState } from "../data/entity";
import { computeAttributeValueDisplay } from "../common/entity/compute_attribute_display";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { haStyle } from "../resources/styles";

@customElement("state-card-event")
export class StateCardEvent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  protected render() {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <div class="event_type">
          ${isUnavailableState(this.stateObj.state)
            ? computeStateDisplay(
                this.hass!.localize,
                this.stateObj,
                this.hass.locale,
                this.hass.config,
                this.hass.entities
              )
            : computeAttributeValueDisplay(
                this.hass!.localize,
                this.stateObj,
                this.hass.locale,
                this.hass.config,
                this.hass.entities,
                "event_type"
              )}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-event": StateCardEvent;
  }
}
