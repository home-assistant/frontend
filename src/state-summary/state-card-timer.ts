import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/state-info";
import { computeDisplayTimer, timerTimeRemaining } from "../data/timer";
import { HomeAssistant } from "../types";
import { haStyle } from "../resources/styles";

@customElement("state-card-timer")
class StateCardTimer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  @property({ type: Number }) public timeRemaining?: number;

  private _updateRemaining: any;

  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <div class="state">
          ${this._displayState(this.timeRemaining, this.stateObj)}
        </div>
      </div>
    `;
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
    return computeDisplayTimer(this.hass, stateObj, timeRemaining);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .state {
          color: var(--primary-text-color);

          margin-left: 16px;
          margin-inline-start: 16px;
          margin-inline-end: initial;
          text-align: var(--float-end);
          line-height: 40px;
          white-space: nowrap;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-timer": StateCardTimer;
  }
}
