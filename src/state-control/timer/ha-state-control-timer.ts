import { mdiPause, mdiPlay, mdiStop } from "@mdi/js";
import { CSSResultGroup, LitElement, PropertyValues, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stateActive } from "../../common/entity/state_active";
import { stateColorCss } from "../../common/entity/state_color";
import "../../components/ha-big-number";
import "../../components/ha-control-circular-slider";
import "../../components/ha-outlined-icon-button";
import "../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../data/entity";
import { HomeAssistant } from "../../types";
import {
  createStateControlCircularSliderController,
  stateControlCircularSliderStyle,
} from "../state-control-circular-slider-style";
import { TimerEntity, timerTimeRemaining } from "../../data/timer";
import secondsToDuration from "../../common/datetime/seconds_to_duration";
import durationToSeconds from "../../common/datetime/duration_to_seconds";

@customElement("ha-state-control-timer")
export class HaStateControlTimer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: TimerEntity;

  @property() public timeRemaining?: number;

  @state() private _duration?: number;

  private _updateRemaining: any;

  @property({ type: Boolean, attribute: "prevent-interaction-on-scroll" })
  public preventInteractionOnScroll?: boolean;

  private _sizeController = createStateControlCircularSliderController(this);

  private _renderButtons() {
    return html`
      <div class="buttons">
        ${stateActive(this.stateObj)
          ? html`
              <ha-outlined-icon-button
                aria-label=${this.hass.localize("ui.card.timer.actions.pause")}
                @click=${this._handlePause}
              >
                <ha-svg-icon .path=${mdiPause}></ha-svg-icon>
              </ha-outlined-icon-button>
            `
          : html`
              <ha-outlined-icon-button
                aria-label=${this.hass.localize("ui.card.timer.actions.start")}
                @click=${this._handlePlay}
              >
                <ha-svg-icon .path=${mdiPlay}></ha-svg-icon>
              </ha-outlined-icon-button>
            `}
        <ha-outlined-icon-button
          aria-label=${this.hass.localize("ui.card.timer.actions.finish")}
          @click=${this._handleReset}
        >
          <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
        </ha-outlined-icon-button>
      </div>
    `;
  }

  protected render() {
    const active = stateActive(this.stateObj);

    const stateColor = stateColorCss(this.stateObj);

    const containerSizeClass = this._sizeController.value
      ? ` ${this._sizeController.value}`
      : "";

    return html`
      <div
        class="container${containerSizeClass}"
        style=${styleMap({
          "--state-color": stateColor,
          "--action-color": stateColor,
        })}
      >
        <ha-control-circular-slider
          .preventInteractionOnScroll=${this.preventInteractionOnScroll}
          .inactive=${!active}
          .mode=${"start"}
          .current=${this._duration! - this.timeRemaining!}
          .min=${0}
          .max=${this._duration!}
          .step=${1}
          .disabled=${this.stateObj.state !== UNAVAILABLE}
        ></ha-control-circular-slider>
        <div class="info">
          <span class="remaining">
            ${this._displayState(this.timeRemaining, this.stateObj)}
          </span>
          <span class="duration">
            ${this.stateObj.attributes.duration.replace(/^[0:]+/, "")}
          </span>
        </div>
        ${this._renderButtons()}
      </div>
    `;
  }

  private _handlePause() {
    this.hass.callService("timer", "pause", {
      entity_id: this.stateObj.entity_id,
    });
  }

  private _handlePlay() {
    this.hass.callService("timer", "start", {
      entity_id: this.stateObj.entity_id,
    });
  }

  private _handleReset() {
    this.hass.callService("timer", "cancel", {
      entity_id: this.stateObj.entity_id,
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this._startInterval(this.stateObj);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearInterval();
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this._duration = durationToSeconds(this.stateObj.attributes.duration);
      this._startInterval(this.stateObj);
    }
  }

  private _clearInterval() {
    if (this._updateRemaining) {
      clearInterval(this._updateRemaining);
      this._updateRemaining = null;
    }
  }

  private _startInterval(stateObj) {
    this._clearInterval();
    this._calculateRemaining(stateObj);

    if (stateObj.state === "active") {
      this._updateRemaining = setInterval(
        () => this._calculateRemaining(this.stateObj),
        1000
      );
    }
  }

  private _calculateRemaining(stateObj) {
    this.timeRemaining = timerTimeRemaining(stateObj);
  }

  private _displayState(timeRemaining, stateObj) {
    return stateObj.state === "idle"
      ? this.hass.localize("ui.card.timer.state.idle")
      : secondsToDuration(timeRemaining);
  }

  static get styles(): CSSResultGroup {
    return [
      stateControlCircularSliderStyle,
      css`
        .remaining {
          font-size: 57px;
          line-height: 1.12;
          letter-spacing: -0.25px;
        }
        ha-control-circular-slider {
          --control-circular-slider-low-color: var(
            --low-color,
            var(--disabled-color)
          );
          --control-circular-slider-high-color: var(
            --high-color,
            var(--disabled-color)
          );
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-timer": HaStateControlTimer;
  }
}
