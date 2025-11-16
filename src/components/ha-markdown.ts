import {
  css,
  html,
  LitElement,
  nothing,
  type ReactiveElement,
  type CSSResultGroup,
} from "lit";
import { customElement, property, query } from "lit/decorators";
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

  @query("ha-markdown-element") private _markdownElement!: ReactiveElement;

  protected async getUpdateComplete() {
    const result = await super.getUpdateComplete();
    await this._markdownElement.updateComplete;
    return result;
  }

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
      margin: var(--ha-space-1) 0;
    }
    a {
      color: var(--markdown-link-color, var(--primary-color));
    }
    img {
      background-color: rgba(10, 10, 10, 0.15);
      border-radius: var(--markdown-image-border-radius);
      max-width: 100%;
      min-height: 2lh;
      height: auto;
      transition: height 0.2s ease-in-out;
    }
    p:first-child > img:first-child {
      vertical-align: top;
    }
    p:first-child > img:last-child {
      vertical-align: top;
    }
    ol,
    ul {
      list-style-position: inside;
      padding-inline-start: 0;
    }
    li {
      &:has(input[type="checkbox"]) {
        list-style: none;
        & > input[type="checkbox"] {
          margin-left: 0;
        }
      }
    }
    svg {
      background-color: var(--markdown-svg-background-color, none);
      color: var(--markdown-svg-color, none);
    }
    code,
    pre {
      background-color: var(--markdown-code-background-color, none);
      border-radius: var(--ha-border-radius-sm);
      color: var(--markdown-code-text-color, inherit);
    }
    code {
      font-size: var(--ha-font-size-s);
      padding: 0.2em 0.4em;
    }
    pre code {
      padding: 0;
    }
    pre {
      padding: var(--ha-space-4);
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
      margin: var(--ha-space-4) 0;
    }
    table {
      border-collapse: collapse;
      display: block;
      overflow-x: scroll;
    }
    th {
      text-align: justify;
    }
    td,
    th {
      border: 1px solid var(--markdown-table-border-color, transparent);
      padding: 0.25em 0.5em;
    }
    blockquote {
      border-left: 4px solid var(--divider-color);
      margin-inline: 0;
      padding-inline: 1em;
    }
  ` as CSSResultGroup;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-markdown": HaMarkdown;
  }
}
