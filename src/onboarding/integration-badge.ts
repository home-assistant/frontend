import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/ha-svg-icon";
import { brandsUrl } from "../util/brands-url";

@customElement("integration-badge")
class IntegrationBadge extends LitElement {
  @property() public domain!: string;

  @property() public title!: string;

  @property() public badgeIcon?: string;

  @property({ type: Boolean }) public darkOptimizedIcon?: boolean;

  @property({ type: Boolean, reflect: true }) public clickable = false;

  protected render(): TemplateResult {
    return html`
      <div class="icon">
        <img
          src=${brandsUrl({
            domain: this.domain,
            type: "icon",
            darkOptimized: this.darkOptimizedIcon,
          })}
          referrerpolicy="no-referrer"
        />
        ${this.badgeIcon
          ? html`<ha-svg-icon
              class="badge"
              .path=${this.badgeIcon}
            ></ha-svg-icon>`
          : ""}
      </div>
      <div class="title">${this.title}</div>
    `;
  }

  static get styles(): CSSResultGroup {
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

      img {
        max-width: 100%;
        max-height: 100%;
      }

      .icon {
        position: relative;
        margin: 0 auto 8px;
        height: 40px;
        width: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .badge {
        position: absolute;
        color: white;
        bottom: -7px;
        right: -10px;
        background-color: var(--label-badge-green);
        border-radius: 50%;
        display: block;
        --mdc-icon-size: 18px;
        border: 2px solid white;
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
