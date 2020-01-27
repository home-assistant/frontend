import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
  property,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import "./ha-icon";

class HaLabelBadge extends LitElement {
  @property() public value?: string;
  @property() public icon?: string;
  @property() public label?: string;
  @property() public description?: string;
  @property() public image?: string;

  protected render(): TemplateResult {
    return html`
      <div class="badge-container">
        <div class="label-badge" id="badge">
          <div
            class="${classMap({
              value: true,
              big: Boolean(this.value && this.value.length > 4),
            })}"
          >
            ${this.icon && !this.value && !this.image
              ? html`
                  <ha-icon .icon="${this.icon}"></ha-icon>
                `
              : ""}
            ${this.value && !this.image
              ? html`
                  <span>${this.value}</span>
                `
              : ""}
          </div>
          ${this.label
            ? html`
                <div
                  class="${classMap({
                    label: true,
                    big: this.label.length > 5,
                  })}"
                >
                  <span>${this.label}</span>
                </div>
              `
            : ""}
        </div>
        ${this.description
          ? html`
              <div class="title">${this.description}</div>
            `
          : ""}
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .badge-container {
          display: inline-block;
          text-align: center;
          vertical-align: top;
        }
        .label-badge {
          position: relative;
          display: block;
          margin: 0 auto;
          width: var(--ha-label-badge-size, 2.5em);
          text-align: center;
          height: var(--ha-label-badge-size, 2.5em);
          line-height: var(--ha-label-badge-size, 2.5em);
          font-size: var(--ha-label-badge-font-size, 1.5em);
          border-radius: 50%;
          border: 0.1em solid var(--ha-label-badge-color, var(--primary-color));
          color: var(--label-badge-text-color, rgb(76, 76, 76));

          white-space: nowrap;
          background-color: var(--label-badge-background-color, white);
          background-size: cover;
          transition: border 0.3s ease-in-out;
        }
        .label-badge .value {
          font-size: 90%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .label-badge .value.big {
          font-size: 70%;
        }
        .label-badge .label {
          position: absolute;
          bottom: -1em;
          /* Make the label as wide as container+border. (parent_borderwidth / font-size) */
          left: -0.2em;
          right: -0.2em;
          line-height: 1em;
          font-size: 0.5em;
        }
        .label-badge .label span {
          box-sizing: border-box;
          max-width: 100%;
          display: inline-block;
          background-color: var(--ha-label-badge-color, var(--primary-color));
          color: var(--ha-label-badge-label-color, white);
          border-radius: 1em;
          padding: 9% 16% 8% 16%; /* mostly apitalized text, not much descenders => bit more top margin */
          font-weight: 500;
          overflow: hidden;
          text-transform: uppercase;
          text-overflow: ellipsis;
          transition: background-color 0.3s ease-in-out;
          text-transform: var(--ha-label-badge-label-text-transform, uppercase);
        }
        .label-badge .label.big span {
          font-size: 90%;
          padding: 10% 12% 7% 12%; /* push smaller text a bit down to center vertically */
        }
        .badge-container .title {
          margin-top: 1em;
          font-size: var(--ha-label-badge-title-font-size, 0.9em);
          width: var(--ha-label-badge-title-width, 5em);
          font-weight: var(--ha-label-badge-title-font-weight, 400);
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: normal;
        }
      `,
    ];
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("image")) {
      this.shadowRoot!.getElementById("badge")!.style.backgroundImage = this
        .image
        ? `url(${this.image})`
        : "";
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-label-badge": HaLabelBadge;
  }
}

customElements.define("ha-label-badge", HaLabelBadge);
