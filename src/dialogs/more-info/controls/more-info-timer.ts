import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-button";
import "../../../components/ha-duration-input";
import type { HaDurationData } from "../../../components/ha-duration-input";
import type { TimerEntity } from "../../../data/timer";
import { timerDurationData } from "../../../data/timer";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";

@customElement("more-info-timer")
class MoreInfoTimer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: TimerEntity;

  @state() private _duration?: HaDurationData;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    // Seed the field once from the configured duration and keep it static,
    // so it never jumps to the live remaining time as the timer ticks.
    if (this._duration === undefined && this.stateObj) {
      this._duration = timerDurationData(this.stateObj);
    }
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const timerState = this.stateObj.state;

    return html`
      <ha-duration-input
        .data=${this._duration}
        required
        @value-changed=${this._durationChanged}
      ></ha-duration-input>
      <div class="actions">
        ${timerState === "idle"
          ? html`
              <ha-button appearance="plain" size="s" @click=${this._start}>
                ${this.hass.localize("ui.card.timer.actions.start")}
              </ha-button>
            `
          : nothing}
        ${timerState === "active" || timerState === "paused"
          ? html`
              <ha-button appearance="plain" size="s" @click=${this._start}>
                ${this.hass.localize("ui.card.timer.actions.set")}
              </ha-button>
            `
          : nothing}
        ${timerState === "active"
          ? html`
              <ha-button
                appearance="plain"
                size="s"
                .action=${"pause"}
                @click=${this._handleActionClick}
              >
                ${this.hass.localize("ui.card.timer.actions.pause")}
              </ha-button>
            `
          : nothing}
        ${timerState === "paused"
          ? html`
              <ha-button
                appearance="plain"
                size="s"
                .action=${"start"}
                @click=${this._handleActionClick}
              >
                ${this.hass.localize("ui.card.timer.actions.start")}
              </ha-button>
            `
          : nothing}
        ${timerState === "active" || timerState === "paused"
          ? html`
              <ha-button
                appearance="plain"
                size="s"
                .action=${"cancel"}
                @click=${this._handleActionClick}
              >
                ${this.hass.localize("ui.card.timer.actions.cancel")}
              </ha-button>
              <ha-button
                appearance="plain"
                size="s"
                .action=${"finish"}
                @click=${this._handleActionClick}
              >
                ${this.hass.localize("ui.card.timer.actions.finish")}
              </ha-button>
            `
          : nothing}
      </div>
    `;
  }

  private _durationChanged(
    ev: ValueChangedEvent<HaDurationData | undefined>
  ): void {
    this._duration = ev.detail.value;
  }

  // Used by idle "Start" and active/paused "Set": (re)starts the timer with the
  // entered duration. timer.start has no upper bound, so values beyond the
  // configured duration are accepted.
  private _start(): void {
    this.hass.callService("timer", "start", {
      entity_id: this.stateObj!.entity_id,
      ...(this._duration ? { duration: this._duration } : {}),
    });
  }

  private _handleActionClick(e: MouseEvent): void {
    const action = (e.currentTarget as any).action;
    this.hass.callService("timer", action, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static styles = css`
    ha-duration-input {
      display: flex;
      justify-content: center;
      margin: var(--ha-space-4) 0 var(--ha-space-2);
    }
    .actions {
      margin: var(--ha-space-2) 0;
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-2);
      justify-content: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-timer": MoreInfoTimer;
  }
}
