import {
  mdiClose,
  mdiPause,
  mdiPlay,
  mdiPlus,
  mdiTimerPlusOutline,
} from "@mdi/js";
import type {
  Connection,
  HassEntity,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import {
  formatDurationDigital,
  formatDurationLong,
} from "../../common/datetime/format_duration";
import { consume } from "../../common/decorators/consume";
import { consumeEntityState } from "../../common/decorators/consume-context-entry";
import { transform } from "../../common/decorators/transform";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import { supportsFeature } from "../../common/entity/supports-feature";
import {
  apiContext,
  connectionContext,
  internationalizationContext,
} from "../../data/context";
import { UNAVAILABLE } from "../../data/entity/entity";
import { normalizeTimerDuration } from "../../data/timer";
import type { TimerListTimer } from "../../data/timer_list";
import {
  addTimerListTimerTime,
  callTimerListTimerAction,
  subscribeTimerListTimers,
  TimerListEntityFeature,
  timerListTimerRemaining,
  timerListTimerVisible,
} from "../../data/timer_list";
import type {
  HomeAssistantApi,
  HomeAssistantConnection,
  HomeAssistantInternationalization,
} from "../../types";
import "../ha-button";
import "../ha-icon-button";
import "../ha-svg-icon";
import type { HaIconButton } from "../ha-icon-button";
import "../progress/ha-progress-bar";
import { showTimerListCreateDialog } from "./show-dialog-timer-list-create";

type TimerButtonEvent = HASSDomCurrentTargetEvent<
  HaIconButton & { timer: TimerListTimer }
>;

@customElement("ha-timer-list")
export class HaTimerList extends LitElement {
  @property({ attribute: false }) public entityId?: string;

  @property({ attribute: "hide-create", type: Boolean })
  public hideCreate = false;

  @property({ attribute: "create-at-end", type: Boolean, reflect: true })
  public createAtEnd = false;

  @state()
  @consumeEntityState({ entityIdPath: ["entityId"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: ({ connection }) => connection,
  })
  private _connection!: Connection;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _timers?: TimerListTimer[];

  private _subscribedEntityId?: string;

  private _unsubTimers?: Promise<UnsubscribeFunc>;

  private _interval?: number;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this.requestUpdate();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
    this._subscribedEntityId = undefined;
    this._clearInterval();
  }

  protected willUpdate(): void {
    // The backend refuses a subscription to an unavailable entity, and drops
    // the subscription when the entity is reloaded.
    const entityId =
      this._stateObj && this._stateObj.state !== UNAVAILABLE
        ? this.entityId
        : undefined;
    if (entityId === this._subscribedEntityId) {
      return;
    }
    this._subscribedEntityId = entityId;
    this._unsubscribe();
    this._timers = undefined;
    if (entityId && this._connection) {
      this._unsubTimers = subscribeTimerListTimers(
        this._connection,
        entityId,
        (timers) => {
          this._timers = timers;
        }
      );
    }
  }

  protected updated(): void {
    // Finished timers need the tick too, to hide them when their time is up.
    const ticking = this._timers?.some(
      (timer) => timer.status !== "paused" && timerListTimerVisible(timer)
    );
    if (ticking && !this._interval) {
      this._interval = window.setInterval(() => this.requestUpdate(), 1000);
    } else if (!ticking) {
      this._clearInterval();
    }
  }

  private _unsubscribe(): void {
    this._unsubTimers?.then((unsub) => unsub());
    this._unsubTimers = undefined;
  }

  private _clearInterval(): void {
    window.clearInterval(this._interval);
    this._interval = undefined;
  }

  protected render() {
    if (!this._stateObj || !this._i18n) {
      return nothing;
    }
    const stateObj = this._stateObj;
    const unavailable = stateObj.state === UNAVAILABLE;
    const timers = this._timers?.filter((timer) =>
      timerListTimerVisible(timer)
    );
    const canPause = supportsFeature(
      stateObj,
      TimerListEntityFeature.PAUSE_TIMER
    );
    const canCancel = supportsFeature(
      stateObj,
      TimerListEntityFeature.CANCEL_TIMER
    );
    const canAddTime = supportsFeature(
      stateObj,
      TimerListEntityFeature.ADD_TIME
    );
    const canRemove = supportsFeature(
      stateObj,
      TimerListEntityFeature.REMOVE_TIMER
    );

    const createButton =
      !this.hideCreate &&
      supportsFeature(stateObj, TimerListEntityFeature.CREATE_TIMER)
        ? html`
            <ha-button
              class="create"
              appearance="filled"
              .disabled=${unavailable}
              @click=${this._showCreateDialog}
            >
              <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
              ${this._i18n.localize("ui.components.timer-list.start_timer")}
            </ha-button>
          `
        : nothing;

    return html`
      ${this.createAtEnd ? nothing : createButton}
      ${
        !timers
          ? nothing
          : !timers.length
            ? html`<p class="empty">
                ${this._i18n.localize("ui.components.timer-list.no_timers")}
              </p>`
            : html`
                <ul>
                  ${repeat(
                    timers,
                    (timer) => timer.timer_id,
                    (timer) => {
                      const paused = timer.status === "paused";
                      const finished = timer.status === "finished";
                      const remaining = timerListTimerRemaining(timer);
                      const name =
                        timer.name ||
                        formatDurationLong(
                          this._i18n.locale,
                          normalizeTimerDuration({
                            seconds: timer.created_duration,
                          })
                        );
                      return html`
                        <li class=${classMap({ paused, finished })}>
                          <div class="row">
                            <div class="info">
                              <span class="remaining">
                                ${formatDurationDigital(
                                  this._i18n.locale,
                                  normalizeTimerDuration({
                                    seconds: Math.ceil(remaining),
                                  })
                                )}
                              </span>
                              <span class="name">
                                ${
                                  paused || finished
                                    ? this._i18n.localize(
                                        finished
                                          ? "ui.components.timer-list.finished_name"
                                          : "ui.components.timer-list.paused_name",
                                        { name }
                                      )
                                    : name
                                }
                              </span>
                            </div>
                            ${
                              canAddTime && !finished
                                ? html`<ha-icon-button
                                    .timer=${timer}
                                    .path=${mdiTimerPlusOutline}
                                    .label=${this._i18n.localize(
                                      "ui.components.timer-list.add_minute"
                                    )}
                                    @click=${this._addMinute}
                                  ></ha-icon-button>`
                                : nothing
                            }
                            ${
                              canPause && !finished
                                ? html`<ha-icon-button
                                    .timer=${timer}
                                    .path=${paused ? mdiPlay : mdiPause}
                                    .label=${this._i18n.localize(
                                      paused
                                        ? "ui.components.timer-list.resume"
                                        : "ui.components.timer-list.pause"
                                    )}
                                    @click=${this._togglePause}
                                  ></ha-icon-button>`
                                : nothing
                            }
                            ${
                              (finished ? canRemove : canCancel)
                                ? html`<ha-icon-button
                                    .timer=${timer}
                                    .path=${mdiClose}
                                    .label=${this._i18n.localize(
                                      finished
                                        ? "ui.components.timer-list.remove"
                                        : "ui.components.timer-list.cancel"
                                    )}
                                    @click=${this._cancelOrRemove}
                                  ></ha-icon-button>`
                                : nothing
                            }
                          </div>
                          <ha-progress-bar
                            .label=${name}
                            .value=${
                              timer.total_duration
                                ? (remaining / timer.total_duration) * 100
                                : 0
                            }
                          ></ha-progress-bar>
                        </li>
                      `;
                    }
                  )}
                </ul>
              `
      }
      ${this.createAtEnd ? createButton : nothing}
    `;
  }

  private _showCreateDialog(): void {
    showTimerListCreateDialog(this, { entityId: this.entityId! });
  }

  private _addMinute(ev: TimerButtonEvent): void {
    addTimerListTimerTime(
      this._api.callService,
      this.entityId!,
      ev.currentTarget.timer.timer_id,
      { minutes: 1 }
    );
  }

  private _togglePause(ev: TimerButtonEvent): void {
    const { timer } = ev.currentTarget;
    callTimerListTimerAction(
      this._api.callService,
      this.entityId!,
      timer.status === "paused" ? "unpause_timer" : "pause_timer",
      timer.timer_id
    );
  }

  private _cancelOrRemove(ev: TimerButtonEvent): void {
    const { timer } = ev.currentTarget;
    callTimerListTimerAction(
      this._api.callService,
      this.entityId!,
      timer.status === "finished" ? "remove_timer" : "cancel_timer",
      timer.timer_id
    );
  }

  static styles = css`
    :host {
      display: block;
    }
    .create {
      width: 100%;
      margin-bottom: var(--ha-space-4);
    }
    :host([create-at-end]) .create {
      margin-top: var(--ha-space-4);
      margin-bottom: 0;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
    }
    .row {
      display: flex;
      align-items: center;
    }
    .info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .remaining {
      font-size: var(--ha-font-size-2xl);
      line-height: var(--ha-line-height-condensed);
      font-variant-numeric: tabular-nums;
    }
    .name {
      color: var(--secondary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .paused .remaining {
      color: var(--secondary-text-color);
    }
    .finished .remaining {
      color: var(--error-color);
    }
    ha-progress-bar {
      --ha-progress-bar-track-height: 4px;
      margin-top: var(--ha-space-1);
    }
    .empty {
      margin: 0;
      padding: var(--ha-space-4) 0;
      color: var(--secondary-text-color);
      text-align: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-timer-list": HaTimerList;
  }
}
