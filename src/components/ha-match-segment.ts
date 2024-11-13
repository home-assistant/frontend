import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { MatchToken } from "../common/string/filter/sequence-matching";

@customElement("ha-match-segment")
class HaMatchSegment extends LitElement {
  @property({ type: Array }) public segments?: MatchToken[];

  protected render() {
    if (!this.segments || this.segments.length === 0) {
      return nothing;
    }

    return html`${this.segments.map((segment) =>
      segment.match
        ? html`<span class="highlight">${segment.text}</span>`
        : html`${segment.text}`
    )}`;
  }

  static get styles(): CSSResultGroup {
    return css`
      .highlight {
        opacity: 0.7;
        text-decoration: underline;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-match-segment": HaMatchSegment;
  }
}
