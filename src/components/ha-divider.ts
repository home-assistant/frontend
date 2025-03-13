import { css, html, LitElement, nothing } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { customElement, property } from "lit/decorators";

@customElement("ha-divider")
export class HaMdDivider extends LitElement {
  @property() public label?: string;

  public render() {
    return html`
      <div
        role=${ifDefined(this.label ? "separator" : undefined)}
        aria-label=${ifDefined(this.label)}
      >
        <span class="line"></span>
        ${this.label
          ? html`
              <span class="label">${this.label}</span>
              <span class="line"></span>
            `
          : nothing}
      </div>
    `;
  }

  static styles = css`
    :host {
      width: var(--ha-divider-width, 100%);
    }
    div {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .label {
      padding: var(--ha-divider-label-padding, 0 16px);
    }
    .line {
      flex: 1;
      background-color: var(--divider-color);
      height: var(--ha-divider-line-height, 1px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-divider": HaMdDivider;
  }
}
