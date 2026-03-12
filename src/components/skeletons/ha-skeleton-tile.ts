import "@home-assistant/webawesome/dist/components/skeleton/skeleton";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-skeleton-tile")
export class HaSkeletonTile extends LitElement {
  protected render() {
    return html`
      <div class="tile">
        <wa-skeleton class="icon" effect="sheen"></wa-skeleton>
        <div class="info">
          <wa-skeleton class="primary" effect="sheen"></wa-skeleton>
          <wa-skeleton class="secondary" effect="sheen"></wa-skeleton>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    wa-skeleton {
      width: 100%;
      height: 100%;
      --color: var(--ha-skeleton-color, var(--secondary-background-color));
      --sheen-color: var(
        --ha-skeleton-sheen-color,
        color-mix(
          in srgb,
          var(--ha-skeleton-color, var(--secondary-background-color)) 70%,
          white
        )
      );
    }

    wa-skeleton::part(indicator) {
      border-radius: var(--ha-border-radius-sm);
    }

    .tile {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 100%;
    }

    .icon {
      width: 30px;
      height: 30px;
      flex: none;
    }

    .icon::part(indicator) {
      border-radius: var(--ha-border-radius-circle);
    }

    .info {
      display: flex;
      flex: 1;
      min-width: 0;
      flex-direction: column;
      gap: 5px;
      justify-content: center;
    }

    .primary {
      height: 18px;
      width: min(68%, 240px);
    }

    .secondary {
      height: 14px;
      width: min(22%, 84px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-skeleton-tile": HaSkeletonTile;
  }
}
