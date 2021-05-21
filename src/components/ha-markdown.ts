import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-markdown-element";

@customElement("ha-markdown")
class HaMarkdown extends LitElement {
  @property() public content?;

  @property({ type: Boolean }) public allowSvg = false;

  @property({ type: Boolean }) public breaks = false;

  protected render(): TemplateResult {
    if (!this.content) {
      return html``;
    }

    return html`<ha-markdown-element
      .content=${this.content}
      .allowSvg=${this.allowSvg}
      .breaks=${this.breaks}
    ></ha-markdown-element>`;
  }

  static get styles(): CSSResultGroup {
    return css`
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
      ha-markdown-element a {
        color: var(--primary-color);
      }
      ha-markdown-element img {
        max-width: 100%;
      }
      ha-markdown-element code,
      pre {
        background-color: var(--markdown-code-background-color, none);
        border-radius: 3px;
      }
      ha-markdown-element svg {
        background-color: var(--markdown-svg-background-color, none);
        color: var(--markdown-svg-color, none);
      }
      ha-markdown-element code {
        font-size: 85%;
        padding: 0.2em 0.4em;
      }
      ha-markdown-element pre code {
        padding: 0;
      }
      ha-markdown-element pre {
        padding: 16px;
        overflow: auto;
        line-height: 1.45;
        font-family: var(--code-font-family, monospace);
      }
      ha-markdown-element h2 {
        font-size: 1.5em;
        font-weight: bold;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-markdown": HaMarkdown;
  }
}
