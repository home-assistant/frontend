import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { transform } from "../common/decorators/transform";
import { formatNumber } from "../common/number/format_number";
import {
  configContext,
  formattersContext,
  internationalizationContext,
} from "../data/context";
import type { FrontendLocaleData } from "../data/translation";
import { haStyle } from "../resources/styles";
import type {
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../types";

@customElement("ha-water_heater-state")
export class HaWaterHeaterState extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters?: HomeAssistantFormatters;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig?: HomeAssistantConfig;

  @property({ attribute: false }) public stateObj!: HassEntity;

  protected render(): TemplateResult {
    return html`
      <div class="target">
        <span class="state-label label">
          ${this._formatters?.formatEntityState(this.stateObj)}
        </span>
        <span class="label">${this._computeTarget()}</span>
      </div>
    `;
  }

  private _computeTarget() {
    if (!this._locale || !this._hassConfig || !this.stateObj) return null;
    const stateObj = this.stateObj;
    // We're using "!= null" on purpose so that we match both null and undefined.

    if (
      stateObj.attributes.target_temp_low != null &&
      stateObj.attributes.target_temp_high != null
    ) {
      return `${formatNumber(
        stateObj.attributes.target_temp_low,
        this._locale
      )} – ${formatNumber(
        stateObj.attributes.target_temp_high,
        this._locale
      )} ${this._hassConfig.config.unit_system.temperature}`;
    }
    if (stateObj.attributes.temperature != null) {
      return `${formatNumber(
        stateObj.attributes.temperature,
        this._locale
      )} ${this._hassConfig.config.unit_system.temperature}`;
    }

    return "";
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
        }

        .state-label {
          font-weight: var(--ha-font-weight-bold);
        }

        .label {
          direction: ltr;
          display: inline-block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-water_heater-state": HaWaterHeaterState;
  }
}
