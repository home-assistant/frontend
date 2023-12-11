import "@material/mwc-button";
import { CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../state-control/timer/ha-state-control-timer";
import { TimerEntity } from "../../../data/timer";
import { HomeAssistant } from "../../../types";
import { moreInfoControlStyle } from "../components/more-info-control-style";

@customElement("more-info-timer")
class MoreInfoTimer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: TimerEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    return html`
      <div class="controls">
        <ha-state-control-timer
          .hass=${this.hass}
          .stateObj=${this.stateObj}
        ></ha-state-control-timer>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return moreInfoControlStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-timer": MoreInfoTimer;
  }
}
