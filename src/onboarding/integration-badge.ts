import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { brandsUrl } from "../util/brands-url";

@customElement("integration-badge")
class IntegrationBadge extends LitElement {
  @property() public domain!: string;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ attribute: false }) public title!: string;

  @property({ attribute: "dark-optimized-icon", type: Boolean })
  public darkOptimizedIcon = false;

  @property({ attribute: false, type: Boolean, reflect: true })
  public clickable = false;

  protected render(): TemplateResult {
    return html`
      <div class="icon">
        <img
          alt=""
          src=${brandsUrl({
            domain: this.domain,
            type: "icon",
            darkOptimized: this.darkOptimizedIcon,
          })}
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
        />
      </div>
      <div class="title">${this.title}</div>
    `;
  }

  static styles = css`
    :host {
      display: inline-flex;
      flex-direction: column;
      text-align: center;
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

    .title {
      min-height: 2.3em;
      word-break: break-word;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "integration-badge": IntegrationBadge;
  }
}
