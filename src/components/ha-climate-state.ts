import { consume } from "@lit/context";
import type { ContextType } from "@lit/context";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import type { ClimateEntity } from "../data/climate";
import { CLIMATE_PRESET_NONE } from "../data/climate";
import { formattersContext } from "../data/context";
import { OFF, UNAVAILABLE, UNKNOWN } from "../data/entity/entity";

@customElement("ha-climate-state")
class HaClimateState extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters?: ContextType<typeof formattersContext>;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @property({ attribute: false }) public stateObj!: ClimateEntity;

  protected render(): TemplateResult {
    const currentStatus = this._computeCurrentStatus();
    const noValue =
      this.stateObj.state === UNAVAILABLE || this.stateObj.state === UNKNOWN;

    return html`<div class="target">
        ${!noValue
          ? html`<span class="state-label">
                ${this._localizeState()}
                ${this.stateObj.attributes.preset_mode &&
                this.stateObj.attributes.preset_mode !== CLIMATE_PRESET_NONE
                  ? html`-
                    ${this._formatters!.formatEntityAttributeValue(
                      this.stateObj,
                      "preset_mode"
                    )}`
                  : nothing}
              </span>
              <div class="unit">${this._computeTarget()}</div>`
          : this._localizeState()}
      </div>

      ${currentStatus && !noValue
        ? html`
            <div class="current">
              ${this._localize("ui.card.climate.currently")}:
              <div class="unit">${currentStatus}</div>
            </div>
          `
        : nothing}`;
  }

  private _computeCurrentStatus(): string | undefined {
    if (!this._formatters || !this.stateObj) {
      return undefined;
    }
    if (
      this.stateObj.attributes.current_temperature != null &&
      this.stateObj.attributes.current_humidity != null
    ) {
      return `${this._formatters.formatEntityAttributeValue(
        this.stateObj,
        "current_temperature"
      )}/
      ${this._formatters.formatEntityAttributeValue(
        this.stateObj,
        "current_humidity"
      )}`;
    }

    if (this.stateObj.attributes.current_temperature != null) {
      return this._formatters.formatEntityAttributeValue(
        this.stateObj,
        "current_temperature"
      );
    }

    if (this.stateObj.attributes.current_humidity != null) {
      return this._formatters.formatEntityAttributeValue(
        this.stateObj,
        "current_humidity"
      );
    }

    return undefined;
  }

  private _computeTarget(): string {
    if (!this._formatters || !this.stateObj) {
      return "";
    }

    if (
      this.stateObj.attributes.target_temp_low != null &&
      this.stateObj.attributes.target_temp_high != null
    ) {
      return `${this._formatters.formatEntityAttributeValue(
        this.stateObj,
        "target_temp_low"
      )}-${this._formatters.formatEntityAttributeValue(
        this.stateObj,
        "target_temp_high"
      )}`;
    }

    if (this.stateObj.attributes.temperature != null) {
      return this._formatters.formatEntityAttributeValue(
        this.stateObj,
        "temperature"
      );
    }
    if (
      this.stateObj.attributes.target_humidity_low != null &&
      this.stateObj.attributes.target_humidity_high != null
    ) {
      return `${this._formatters.formatEntityAttributeValue(
        this.stateObj,
        "target_humidity_low"
      )}-${this._formatters.formatEntityAttributeValue(
        this.stateObj,
        "target_humidity_high"
      )}`;
    }

    if (this.stateObj.attributes.humidity != null) {
      return this._formatters.formatEntityAttributeValue(
        this.stateObj,
        "humidity"
      );
    }

    return "";
  }

  private _localizeState(): string {
    if (
      this.stateObj.state === UNAVAILABLE ||
      this.stateObj.state === UNKNOWN
    ) {
      return this._localize(`state.default.${this.stateObj.state}`);
    }

    const stateString = this._formatters!.formatEntityState(this.stateObj);

    if (this.stateObj.attributes.hvac_action && this.stateObj.state !== OFF) {
      const actionString = this._formatters!.formatEntityAttributeValue(
        this.stateObj,
        "hvac_action"
      );
      return `${actionString} (${stateString})`;
    }

    return stateString;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      justify-content: center;
      white-space: nowrap;
    }

    .target {
      color: var(--primary-text-color);
    }

    .current {
      color: var(--secondary-text-color);
      direction: var(--direction);
    }

    .state-label {
      font-weight: var(--ha-font-weight-bold);
    }

    .unit {
      display: inline-block;
      direction: ltr;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-climate-state": HaClimateState;
  }
}
