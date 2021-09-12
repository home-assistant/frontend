import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { computeDisplayTimer, timerTimeRemaining } from "../../../data/timer";
import { HomeAssistant } from "../../../types";
import { EntitiesCardEntityConfig } from "../cards/types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";

@customElement("hui-timer-entity-row")
class HuiTimerEntityRow extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntitiesCardEntityConfig;

  @state() private _timeRemaining?: number;

  private _interval?: number;

  public setConfig(config: EntitiesCardEntityConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearInterval();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._config && this._config.entity) {
      const stateObj = this.hass?.states[this._config!.entity];
      if (stateObj) {
        this._startInterval(stateObj);
      }
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const pointer =
      (this._config.tap_action && this._config.tap_action.action !== "none") ||
      (this._config.entity &&
        !DOMAINS_HIDE_MORE_INFO.includes(computeDomain(this._config.entity)));

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        <div
          class="text-content ${classMap({
            pointer,
          })}"
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this._config.hold_action),
            hasDoubleClick: hasAction(this._config.double_tap_action),
          })}
        >
          ${computeDisplayTimer(this.hass, stateObj, this._timeRemaining)}
        </div>
      </hui-generic-entity-row>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_timeRemaining")) {
      return true;
    }

    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("hass")) {
      const stateObj = this.hass!.states[this._config!.entity];
      const oldHass = changedProps.get("hass") as this["hass"];
      const oldStateObj = oldHass
        ? oldHass.states[this._config!.entity]
        : undefined;

      if (oldStateObj !== stateObj) {
        this._startInterval(stateObj);
      } else if (!stateObj) {
        this._clearInterval();
      }
    }
  }

  private _clearInterval(): void {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private _startInterval(stateObj: HassEntity): void {
    this._clearInterval();
    this._calculateRemaining(stateObj);

    if (stateObj.state === "active") {
      this._interval = window.setInterval(
        () => this._calculateRemaining(stateObj),
        1000
      );
    }
  }

  private _calculateRemaining(stateObj: HassEntity): void {
    this._timeRemaining = timerTimeRemaining(stateObj);
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResultGroup {
    return css`
      .pointer {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-entity-row": HuiTimerEntityRow;
  }
}
