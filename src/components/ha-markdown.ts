import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-markdown-element";

@customElement("ha-markdown")
export class HaMarkdown extends LitElement {
  @property() public content?;

  @property({ attribute: "allow-svg", type: Boolean }) public allowSvg = false;

  @property({ attribute: "allow-data-url", type: Boolean })
  public allowDataUrl = false;

  @property({ type: Boolean }) public breaks = false;

  @property({ type: Boolean, attribute: "lazy-images" }) public lazyImages =
    false;

  @property({ type: Boolean }) public cache = false;

  protected render() {
    if (!this.content) {
      return nothing;
    }

    return html`<ha-markdown-element
      .content=${this.content}
      .allowSvg=${this.allowSvg}
      .allowDataUrl=${this.allowDataUrl}
      .breaks=${this.breaks}
      .lazyImages=${this.lazyImages}
      .cache=${this.cache}
    ></ha-markdown-element>`;
  }

  async getUpdateComplete(): Promise<boolean> {
    const result = await super.getUpdateComplete();
    const markdownEl = this.shadowRoot?.querySelector("ha-markdown-element");
    if (markdownEl?.updateComplete) {
      await markdownEl.updateComplete;
    }
    return result;
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-markdown-element {
      -ms-user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
    }
    ha-markdown-element > *:first-child {
      margin-top: 0;
    }
    ha-markdown-element > *:last-child {
      margin-bottom: 0;
    }
    ha-alert {
      display: block;
      margin: 4px 0;
    }
    a {
      color: var(--primary-color);
    }
    img {
      max-width: 100%;
    }
    code,
    pre {
      background-color: var(--markdown-code-background-color, none);
      border-radius: 3px;
    }
    svg {
      background-color: var(--markdown-svg-background-color, none);
      color: var(--markdown-svg-color, none);
    }
    code {
      font-size: var(--ha-font-size-s);
      padding: 0.2em 0.4em;
    }
    pre code {
      padding: 0;
    }
    pre {
      padding: 16px;
      overflow: auto;
      line-height: var(--ha-line-height-condensed);
      font-family: var(--ha-font-family-code);
    }
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      line-height: initial;
    }
    h2 {
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-bold);
    }
    hr {
      border-color: var(--divider-color);
      border-bottom: none;
      margin: 16px 0;
    }
  ` as CSSResultGroup;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-markdown": HaMarkdown;
  }
}
