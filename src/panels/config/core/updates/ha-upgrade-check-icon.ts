import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-svg-icon";

// Round, tinted icon, like the status icons of update history.
@customElement("ha-upgrade-check-icon")
export class HaUpgradeCheckIcon extends LitElement {
  @property({ attribute: false }) public path!: string;

  // The loud tone heads a card.
  @property() public tone:
    "warning" | "primary" | "success" | "neutral" | "neutral-loud" = "warning";

  protected render() {
    return html`<span class=${this.tone}>
      <ha-svg-icon .path=${this.path}></ha-svg-icon>
    </span>`;
  }

  static styles = css`
    :host {
      display: block;
      flex: none;
      --upgrade-check-icon-size: 40px;
    }
    span {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--upgrade-check-icon-size);
      height: var(--upgrade-check-icon-size);
      border-radius: 50%;
      --mdc-icon-size: calc(var(--upgrade-check-icon-size) * 0.55);
    }
    .warning {
      background-color: var(--ha-color-fill-warning-quiet-resting);
      color: var(--ha-color-on-warning-quiet);
    }
    .primary {
      background-color: var(--ha-color-fill-primary-quiet-resting);
      color: var(--ha-color-on-primary-quiet);
    }
    .success {
      background-color: var(--ha-color-fill-success-quiet-resting);
      color: var(--ha-color-on-success-quiet);
    }
    .neutral {
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      color: var(--ha-color-on-neutral-quiet);
    }
    .neutral-loud {
      background-color: var(--ha-color-fill-neutral-loud-resting);
      color: var(--ha-color-on-neutral-loud);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-upgrade-check-icon": HaUpgradeCheckIcon;
  }
}
