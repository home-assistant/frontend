import {
  LitElement,
  TemplateResult,
  html,
  customElement,
  property,
  CSSResult,
  css,
} from "lit-element";
import "../components/ha-icon";

@customElement("integration-badge")
class IntegrationBadge extends LitElement {
  @property() public icon!: string;
  @property() public title!: string;
  @property() public badgeIcon?: string;
  @property({ type: Boolean, reflect: true }) public clickable = false;

  protected render(): TemplateResult {
    return html`
      <div class="icon">
        <iron-icon .icon=${this.icon}></iron-icon>
        ${this.badgeIcon
          ? html`
              <ha-icon class="badge" .icon=${this.badgeIcon}></ha-icon>
            `
          : ""}
      </div>
      <div class="title">${this.title}</div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: inline-flex;
        flex-direction: column;
        text-align: center;
        color: var(--primary-text-color);
      }

      :host([clickable]) {
        color: var(--primary-text-color);
      }

      .icon {
        position: relative;
        margin: 0 auto 8px;
        height: 40px;
        width: 40px;
        border-radius: 50%;
        border: 1px solid var(--secondary-text-color);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      :host([clickable]) .icon {
        border-color: var(--primary-color);
        border-width: 2px;
      }

      .badge {
        position: absolute;
        color: var(--primary-color);
        bottom: -5px;
        right: -5px;
        background-color: white;
        border-radius: 50%;
        width: 18px;
        display: block;
        height: 18px;
      }

      .title {
        min-height: 2.3em;
        word-break: break-word;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "integration-badge": IntegrationBadge;
  }
}
