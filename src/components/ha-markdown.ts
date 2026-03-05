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

  @query("ha-markdown-element") private _markdownElement?: ReactiveElement;

  protected async getUpdateComplete() {
    const result = await super.getUpdateComplete();
    await this._markdownElement?.updateComplete;
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
      background-color: var(--markdown-image-background-color);
      border-radius: var(--markdown-image-border-radius);
      max-width: 100%;
    }
    p:first-child > img:first-child {
      vertical-align: top;
    }
    p:first-child > img:last-child {
      vertical-align: top;
    }
    ha-markdown-element > :is(ol, ul) {
      padding-inline-start: var(--markdown-list-indent, revert);
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
    table[role="presentation"] {
      --markdown-table-border-collapse: separate;
      --markdown-table-border-width: 0;
      --markdown-table-padding-inline: 0;
      --markdown-table-padding-block: 0;
      th,
      td {
        vertical-align: middle;
      }
    }
    table[role="presentation"] td[valign="top"],
    table[role="presentation"] th[valign="top"] {
      vertical-align: top;
    }
    table[role="presentation"] td[valign="middle"],
    table[role="presentation"] th[valign="middle"] {
      vertical-align: middle;
    }
    table[role="presentation"] td[valign="bottom"],
    table[role="presentation"] th[valign="bottom"] {
      vertical-align: bottom;
    }
    table[role="presentation"] td[valign="baseline"],
    table[role="presentation"] th[valign="baseline"] {
      vertical-align: baseline;
    }
    @supports (border-width: attr(border px, 0)) {
      table[role="presentation"] {
        --markdown-table-border-width: attr(border px, 0);
      }
      table[role="presentation"] th,
      table[role="presentation"] td {
        vertical-align: attr(valign, middle);
      }
    }
    table[role="presentation"][border="0"] {
      --markdown-table-border-width: 0;
    }
    table[role="presentation"][border="1"] {
      --markdown-table-border-width: 1px;
    }
    table[role="presentation"][border="2"] {
      --markdown-table-border-width: 2px;
    }
    table[role="presentation"][border="3"] {
      --markdown-table-border-width: 3px;
    }
    table {
      border-collapse: var(--markdown-table-border-collapse, collapse);
    }
    div:has(> table) {
      overflow: auto;
    }
    th {
      text-align: var(--markdown-table-text-align, start);
    }
    td,
    th {
      border-width: var(--markdown-table-border-width, 1px);
      border-style: var(--markdown-table-border-style, solid);
      border-color: var(--markdown-table-border-color, var(--divider-color));
      padding-inline: var(--markdown-table-padding-inline, 0.5em);
      padding-block: var(--markdown-table-padding-block, 0.25em);
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
