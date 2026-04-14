import type { Completion } from "@codemirror/autocomplete";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { mdiHelpCircleOutline } from "@mdi/js";
import "./ha-svg-icon";

@customElement("ha-code-editor-jinja-hover")
export class HaCodeEditorJinjaHover extends LitElement {
  @property({ attribute: false }) public completion!: Completion;

  @property({ attribute: false }) public docUrl?: string;

  render() {
    const info =
      typeof this.completion.info === "string"
        ? this.completion.info
        : undefined;

    return html`
      <div class="header">
        <div class="sig">
          <strong>${this.completion.label}</strong>
          ${this.completion.detail
            ? html`<span class="detail">(${this.completion.detail})</span>`
            : nothing}
        </div>
        ${this.docUrl
          ? html`<a
              class="doc-link"
              href=${this.docUrl}
              target="_blank"
              rel="noreferrer"
              title="Open documentation"
              ><ha-svg-icon .path=${mdiHelpCircleOutline}></ha-svg-icon
            ></a>`
          : nothing}
      </div>
      ${info ? html`<div class="desc">${info}</div>` : nothing}
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: 6px 10px;
      max-width: 360px;
      line-height: 1.5;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .sig {
      font-family: var(--ha-font-family-code);
      font-size: 0.9em;
      flex: 1;
      min-width: 0;
    }

    .detail {
      color: var(--secondary-text-color);
    }

    .doc-link {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      color: var(--secondary-text-color);
      opacity: 0.7;
      line-height: 1;
    }

    .doc-link:hover {
      opacity: 1;
      color: var(--primary-color);
    }

    .doc-link ha-svg-icon {
      width: 16px;
      height: 16px;
    }

    .desc {
      font-size: 0.9em;
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor-jinja-hover": HaCodeEditorJinjaHover;
  }
}
