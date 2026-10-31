import type { ContextType } from "@lit/context";
import { mdiArrowOscillating, mdiArrowOscillatingOff } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../../common/decorators/consume";
import { formatNumber } from "../../common/number/format_number";
import {
  formattersContext,
  internationalizationContext,
} from "../../data/context";
import type { FanFavorite } from "../../data/entity/entity_registry";
import type { FanEntity } from "../../data/fan";
import {
  computeFanSpeedIcon,
  computeFanSpeeds,
  fanPercentageToSpeed,
  filterFanFavorite,
} from "../../data/fan";
import "../ha-attribute-icon";
import "../ha-control-button";
import "../ha-svg-icon";

/**
 * One fan favorite rendered as a single button, with a segment for each
 * value it sets: speed, direction, and oscillation.
 */
@customElement("ha-fan-favorite-button")
export class HaFanFavoriteButton extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @property({ attribute: false }) public stateObj!: FanEntity;

  @property({ attribute: false }) public favorite!: FanFavorite;

  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  // The favorite matches the current state of the fan.
  @property({ type: Boolean }) public active = false;

  private _renderSpeed(percentage: number): TemplateResult {
    const speeds = computeFanSpeeds(this.stateObj);
    if (speeds) {
      const speed = fanPercentageToSpeed(this.stateObj, percentage);
      const path = computeFanSpeedIcon(this.stateObj, speed);
      if (path) {
        return html`<ha-svg-icon .path=${path}></ha-svg-icon>`;
      }
      return html`<span class="text"
        >${formatNumber(speed, this._i18n.locale)}</span
      >`;
    }
    return html`<span class="text"
      >${this._formatters.formatEntityAttributeValue(
        this.stateObj,
        "percentage",
        percentage
      )}</span
    >`;
  }

  protected render() {
    if (!this.stateObj || !this.favorite || !this._formatters || !this._i18n) {
      return nothing;
    }

    const favorite = filterFanFavorite(this.stateObj, this.favorite);

    return html`
      <ha-control-button
        class=${classMap({ active: this.active })}
        .label=${this.label}
        .disabled=${this.disabled}
      >
        <div class="segments" aria-hidden="true">
          <span class="segment">${this._renderSpeed(favorite.percentage)}</span>
          ${
            favorite.direction !== undefined
              ? html`
                  <span class="separator"></span>
                  <span class="segment">
                    <ha-attribute-icon
                      .stateObj=${this.stateObj}
                      attribute="direction"
                      .attributeValue=${favorite.direction}
                    ></ha-attribute-icon>
                  </span>
                `
              : nothing
          }
          ${
            favorite.oscillating !== undefined
              ? html`
                  <span class="separator"></span>
                  <span class="segment">
                    <ha-svg-icon
                      .path=${
                        favorite.oscillating
                          ? mdiArrowOscillating
                          : mdiArrowOscillatingOff
                      }
                    ></ha-svg-icon>
                  </span>
                `
              : nothing
          }
        </div>
      </ha-control-button>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    ha-control-button {
      --control-button-border-radius: var(--ha-border-radius-pill);
      --control-button-padding: 0 var(--ha-space-1);
      width: auto;
      min-width: 72px;
      height: 36px;
    }

    ha-control-button.active {
      --control-button-background-color: var(
        --favorite-item-active-background-color
      );
    }

    .segments {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .segment {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      padding: 0 var(--ha-space-1);
    }

    .text {
      font-size: var(--ha-font-size-m);
      white-space: nowrap;
    }

    .separator {
      width: 1px;
      height: 20px;
      background-color: var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-fan-favorite-button": HaFanFavoriteButton;
  }
}
