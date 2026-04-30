import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { CompletionItem } from "./ha-code-editor-completion-items";
import "./ha-code-editor-completion-items";

@customElement("ha-code-editor-jinja-arg-hover")
export class HaCodeEditorJinjaArgHover extends LitElement {
  /** Bold heading shown above the items grid (e.g. entity/device/area name). */
  @property({ attribute: false }) public heading?: string;

  @property({ attribute: false }) public items: CompletionItem[] = [];

  render() {
    return html`
      ${this.heading
        ? html`<div class="heading">${this.heading}</div>`
        : nothing}
      <ha-code-editor-completion-items
        .items=${this.items}
      ></ha-code-editor-completion-items>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: 6px 10px;
      max-width: 360px;
    }

    .heading {
      font-weight: var(--ha-font-weight-bold);
      margin-bottom: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor-jinja-arg-hover": HaCodeEditorJinjaArgHover;
  }
}
