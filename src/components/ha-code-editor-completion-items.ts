import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";

export interface CompletionItem {
  label: string;
  value: string;
  subValue?: string;
}

@customElement("ha-code-editor-completion-items")
export class HaCodeEditorCompletionItems extends LitElement {
  @property({ attribute: false }) public items: CompletionItem[] = [];

  render() {
    return this.items.map(
      (item) => html`
        <span><strong>${item.label}</strong>:</span>
        <span
          >${item.value}${item.subValue && item.subValue.length > 0
            ? // prettier-ignore
              html` (<pre>${item.subValue}</pre>)`
            : nothing}</span
        >
      `
    );
  }

  static styles = css`
    :host {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 6px;
      white-space: pre-wrap;
      flex-wrap: nowrap;
    }

    span {
      display: flex;
      align-items: center;
      flex-flow: wrap;
      word-wrap: break-word;
    }

    pre {
      margin: 0 3px;
      padding: 3px;
      background-color: var(--markdown-code-background-color, none);
      border-radius: var(--ha-border-radius-sm, 4px);
      line-height: var(--ha-line-height-condensed);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor-completion-items": HaCodeEditorCompletionItems;
  }
}
