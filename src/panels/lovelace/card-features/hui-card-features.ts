import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { HomeAssistant } from "../../../types";
import "./hui-card-feature";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
  LovelaceCardFeaturePosition,
} from "./types";

/**
 * Home Assistant tile icon component
 *
 * @element hui-card-features
 *
 * @summary
 * A card features component, used in cards in Home Assistant to display extra features in card.
 *
 * @cssprop --ha-card-features-border-radius - The border radius of the card features. defaults to `var(--ha-border-radius-lg)`.
 *
 */
@customElement("hui-card-features")
export class HuiCardFeatures extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @property({ attribute: false }) public features?: LovelaceCardFeatureConfig[];

  @property({ attribute: false }) public color?: string;

  @property({ attribute: false })
  public position?: LovelaceCardFeaturePosition;

  @property({ type: Number, reflect: true })
  public columns = 1;

  protected render() {
    if (!this.features) {
      return nothing;
    }
    const lastIndex = this.features.length - 1;
    const columns = Math.max(this.columns, 1);
    return html`
      ${this.features.map((feature, index) => {
        const column = index % columns;
        return html`
          <hui-card-feature
            class=${classMap({
              divided: column > 0,
              wide: column === 0 && index === lastIndex,
            })}
            .hass=${this.hass}
            .context=${this.context}
            .color=${this.color}
            .feature=${feature}
            .position=${this.position}
          ></hui-card-feature>
        `;
      })}
    `;
  }

  static styles = css`
    :host {
      --feature-color: var(--state-icon-color);
      --feature-height: 42px;
      --feature-columns: 1;
      --feature-border-radius: var(
        --ha-card-features-border-radius,
        var(--ha-border-radius-lg)
      );
      --feature-button-spacing: 12px;
      --feature-column-gap: var(
        --ha-card-feature-column-gap,
        var(--ha-card-feature-gap, 12px)
      );
      --feature-divider-inset: var(--ha-card-feature-divider-inset, 0px);
      pointer-events: none;
      position: relative;
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--ha-card-feature-gap, 12px) var(--feature-column-gap);
      box-sizing: border-box;
      align-content: space-evenly;
    }
    :host([columns="2"]) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .wide {
      grid-column: 1 / -1;
    }
    /* pull the divider out of the column and into the middle of the gutter */
    .divided {
      box-sizing: border-box;
      margin-inline-start: calc(-1 * var(--feature-divider-inset));
      padding-inline-start: var(--feature-divider-inset);
      border-inline-start: var(--ha-card-feature-divider, none);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-features": HuiCardFeatures;
  }
}
