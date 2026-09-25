import { consume } from "@lit/context";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { TimerRemainingTimeController } from "../../../common/controllers/timer-remaining-time-controller";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-button";
import type { HaButton } from "../../../components/ha-button";
import "../../../components/ha-duration-input";
import type { HaDurationData } from "../../../components/ha-duration-input";
import { apiContext, formattersContext } from "../../../data/context";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import { shouldShowFavoriteOptions } from "../../../data/entity/entity_registry";
import type { TimerEntity } from "../../../data/timer";
import {
  computeDisplayTimer,
  timerDurationData,
  timerJustFinished,
} from "../../../data/timer";
import type {
  HomeAssistantApi,
  HomeAssistantFormatters,
  ValueChangedEvent,
} from "../../../types";
import "../components/ha-more-info-state-header";
import "../components/timers/ha-more-info-timer-presets";
import { moreInfoControlStyle } from "../components/more-info-control-style";

@customElement("more-info-timer")
class MoreInfoTimer extends LitElement {
  @property({ attribute: false }) public stateObj?: TimerEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state() private _duration?: HaDurationData;

  @state() private _finished = false;

  private _remainingTime = new TimerRemainingTimeController(this);

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    // Seed the field once from the configured duration and keep it static,
    // so it never jumps to the live remaining time as the timer ticks.
    if (this._duration === undefined && this.stateObj) {
      this._duration = timerDurationData(this.stateObj);
    }
    if (changedProps.has("stateObj")) {
      this._remainingTime.setStateObj(this.stateObj);
      if (
        this.stateObj &&
        timerJustFinished(changedProps.get("stateObj"), this.stateObj)
      ) {
        this._finished = true;
      }
    }
  }

  private _finishedAnimationEnded(): void {
    this._finished = false;
  }

  protected render() {
    if (!this._localize || !this._formatters || !this.stateObj) {
      return nothing;
    }

    const timerState = this.stateObj.state;

    const showPresets = Boolean(
      this.entry &&
      (this.editMode ||
        shouldShowFavoriteOptions(this.entry.options?.timer?.presets))
    );

    return html`
      <ha-more-info-state-header
        class=${classMap({ finished: this._finished })}
        .stateObj=${this.stateObj}
        .stateOverride=${
          computeDisplayTimer(
            this._formatters.formatEntityState,
            this.stateObj,
            this._remainingTime.timeRemaining
          ) ?? undefined
        }
        @animationend=${this._finishedAnimationEnded}
      ></ha-more-info-state-header>
      <div class="controls">
        <ha-duration-input
          .data=${this._duration}
          required
          @value-changed=${this._durationChanged}
        ></ha-duration-input>
        <div class="actions">
          ${
            timerState === "idle"
              ? html`
                  <ha-button appearance="plain" size="s" @click=${this._start}>
                    ${this._localize("ui.card.timer.actions.start")}
                  </ha-button>
                `
              : nothing
          }
          ${
            timerState === "active" || timerState === "paused"
              ? html`
                  <ha-button appearance="plain" size="s" @click=${this._start}>
                    ${this._localize("ui.card.timer.actions.set")}
                  </ha-button>
                `
              : nothing
          }
          ${
            timerState === "active"
              ? html`
                  <ha-button
                    appearance="plain"
                    size="s"
                    .action=${"pause"}
                    @click=${this._handleActionClick}
                  >
                    ${this._localize("ui.card.timer.actions.pause")}
                  </ha-button>
                `
              : nothing
          }
          ${
            timerState === "paused"
              ? html`
                  <ha-button
                    appearance="plain"
                    size="s"
                    .action=${"start"}
                    @click=${this._handleActionClick}
                  >
                    ${this._localize("ui.card.timer.actions.start")}
                  </ha-button>
                `
              : nothing
          }
          ${
            timerState === "active" || timerState === "paused"
              ? html`
                  <ha-button
                    appearance="plain"
                    size="s"
                    .action=${"cancel"}
                    @click=${this._handleActionClick}
                  >
                    ${this._localize("ui.card.timer.actions.cancel")}
                  </ha-button>
                  <ha-button
                    appearance="plain"
                    size="s"
                    .action=${"finish"}
                    @click=${this._handleActionClick}
                  >
                    ${this._localize("ui.card.timer.actions.finish")}
                  </ha-button>
                `
              : nothing
          }
        </div>
        ${
          showPresets
            ? html`
                <ha-more-info-timer-presets
                  .stateObj=${this.stateObj}
                  .entry=${this.entry}
                  .editMode=${this.editMode}
                ></ha-more-info-timer-presets>
              `
            : nothing
        }
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
    this._api.callService("timer", "start", {
      entity_id: this.stateObj!.entity_id,
      ...(this._duration ? { duration: this._duration } : {}),
    });
  }

  private _handleActionClick(
    e: MouseEvent & HASSDomCurrentTargetEvent<HaButton & { action: string }>
  ): void {
    const action = e.currentTarget.action;
    this._api.callService("timer", action, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static styles = [
    moreInfoControlStyle,
    css`
      ha-duration-input {
        display: flex;
        justify-content: center;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ha-space-2);
        justify-content: center;
      }
      ha-more-info-state-header.finished {
        animation: timer-finished-pulse 0.5s ease-in-out 2;
      }
      @keyframes timer-finished-pulse {
        50% {
          color: var(--error-color);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        ha-more-info-state-header.finished {
          animation-duration: var(--ha-animation-duration-none);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-timer": MoreInfoTimer;
  }
}
