import { LitElement, html, css } from "lit";
import type { TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-automation-colored-description")
export class HaAutomationColoredDescription extends LitElement {
  @property({ type: String }) text = "";

  static styles = css`
    .entity {
      color: #007bff;
      font-weight: bold;
    }
    .state {
      color: #6b0c83;
      font-weight: bold;
    }
  `;

  render() {
    return html`${this.parseToTemplate(this.text)}`;
  }

  parseToTemplate(text: string): (string | TemplateResult)[] {
    const tagMap: Record<string, string> = {
      e: "entity",
      s: "state",
      // add more tags here if needed
    };

    const container: (string | TemplateResult)[] = [];
    let current = text;

    while (current.length > 0) {
      // Find the earliest tag occurrence
      let earliestTag: string | null = null;
      let earliestIndex = Infinity;

      for (const tag of Object.keys(tagMap)) {
        const idx = current.indexOf(`<${tag}>`);
        if (idx !== -1 && idx < earliestIndex) {
          earliestTag = tag;
          earliestIndex = idx;
        }
      }

      if (earliestTag === null) {
        // No more tags, push the rest as plain text
        container.push(current);
        break;
      }

      // Push plain text before the tag
      if (earliestIndex > 0) {
        container.push(current.slice(0, earliestIndex));
      }

      const openTag = `<${earliestTag}>`;
      const closeTag = `</${earliestTag}>`;
      const contentStart = earliestIndex + openTag.length;
      const contentEnd = current.indexOf(closeTag, contentStart);

      if (contentEnd !== -1) {
        const content = current.slice(contentStart, contentEnd);
        const className = tagMap[earliestTag];
        container.push(html`<span class=${className}>${content}</span>`);
        current = current.slice(contentEnd + closeTag.length);
      } else {
        container.push(current);
        break;
      }
    }

    return container;
  }

  getNextTagIndex(a: number, b: number): number {
    if (a === -1) return b;
    if (b === -1) return a;
    return Math.min(a, b);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-colored-description": HaAutomationColoredDescription;
  }
}
