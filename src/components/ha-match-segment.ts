import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { MatchToken } from "../common/string/filter/sequence-matching";

@customElement("ha-match-segment")
class HaMatchSegment extends LitElement {
  @property({ type: Array }) public segments?: MatchToken[];

  protected render() {
    if (!this.segments || this.segments.length === 0) {
      return nothing;
    }

    return html`${this.segments.map((segment) =>
      segment.match
        ? html`<u><b style="opacity: 0.7">${segment.text}</b></u>`
        : html`${segment.text}`
    )}`;
  }

  static get styles(): CSSResultGroup {
    return [css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-match-segment": HaMatchSegment;
  }
}
