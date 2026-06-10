import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { debounce } from "../../common/util/debounce";
import type { Condition } from "../../data/automation";
import { subscribeCondition } from "../../data/automation";
import type { HomeAssistant } from "../../types";
import "../ha-tooltip";
import "./ha-automation-row-live-test";
import type { LiveTestState } from "./ha-automation-row-live-test";

@customElement("ha-automation-condition-live-test")
export class HaAutomationConditionLiveTest extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: Condition;

  @state() private _liveTestResult: {
    state: LiveTestState;
    message?: string;
  } = { state: "unknown" };

  private _conditionUnsub?: Promise<UnsubscribeFunc>;

  public connectedCallback(): void {
    super.connectedCallback();
    this._subscribeCondition();
  }

  protected override updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);
    if (
      changedProps.has("condition") &&
      changedProps.get("condition") !== undefined
    ) {
      this._resetSubscription();
      this._debounceSubscribeCondition();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._debounceSubscribeCondition.cancel();
    this._resetSubscription();
  }

  protected render() {
    return html`
      <div id="indicator">
        <slot></slot>
        <ha-automation-row-live-test
          .state=${this._liveTestResult.state}
          .label=${this.hass.localize(
            `ui.panel.config.automation.editor.conditions.live_test_state.${this._liveTestResult.state}`
          )}
        ></ha-automation-row-live-test>
      </div>
      ${this._liveTestResult.message
        ? html`<ha-tooltip for="indicator"
            >${this._liveTestResult.message}</ha-tooltip
          >`
        : nothing}
    `;
  }

  private _resetSubscription() {
    this._liveTestResult = {
      state: "unknown",
      message: this.hass.localize(
        "ui.panel.config.automation.editor.conditions.live_test_state.unknown"
      ),
    };
    if (this._conditionUnsub) {
      this._conditionUnsub.then((unsub) => unsub());
      this._conditionUnsub = undefined;
    }
  }

  private _debounceSubscribeCondition = debounce(
    () => this._subscribeCondition(),
    500
  );

  private async _subscribeCondition() {
    this._resetSubscription();

    if (!this.condition) {
      return;
    }

    const conditionUnsub = subscribeCondition(
      this.hass.connection,
      (result) => {
        if (result.error) {
          this._handleLiveTestError(result.error);
        } else {
          this._liveTestResult = {
            state: result.result ? "pass" : "fail",
            message: this.hass.localize(
              `ui.panel.config.automation.editor.conditions.testing_${result.result ? "pass" : "error"}`
            ),
          };
        }
      },
      this.condition
    );
    conditionUnsub.catch((err: any) => {
      this._handleLiveTestError(err);
      if (this._conditionUnsub === conditionUnsub) {
        this._conditionUnsub = undefined;
      }
    });
    this._conditionUnsub = conditionUnsub;
  }

  private _handleLiveTestError(error: any) {
    const invalid =
      typeof error !== "string" && error.code === "invalid_format";
    this._liveTestResult = {
      state: invalid ? "invalid" : "unknown",
      message: this.hass.localize(
        `ui.panel.config.automation.editor.conditions.${invalid ? "invalid_condition" : "live_test_state.unknown"}`
      ),
    };
  }

  static styles = css`
    :host {
      display: inline-flex;
      position: relative;
    }
    #indicator {
      display: inline-flex;
      position: relative;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-live-test": HaAutomationConditionLiveTest;
  }
}
