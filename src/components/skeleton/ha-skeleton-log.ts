import { ResizeController } from "@lit-labs/observers/resize-controller";
import { css, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import "../animation/ha-fade-in";
import "./ha-skeleton-text";

// Varied widths so the placeholder reads as log lines rather than a block
const LINE_WIDTHS = [72, 58, 86, 64, 44, 78, 52, 90, 60, 70];

const LINE_HEIGHT_EM = 1.5;

/**
 * Placeholder for log lines while a log loads. It covers its nearest
 * positioned ancestor and shows as many whole lines as fit, so it never
 * scrolls. Set `lines` to show that many lines in the flow instead. Like the
 * data table's loading rows, the label is given to assistive technology
 * rather than shown.
 *
 * @cssprop --ha-skeleton-log-padding - The space around the lines. Defaults to `var(--ha-space-2)`.
 */
@customElement("ha-skeleton-log")
export class HaSkeletonLog extends LitElement {
  @property() public label?: string;

  @property({ type: Number, reflect: true }) public lines?: number;

  private _fitLineCount = new ResizeController(this, {
    callback: (entries) => {
      const height = entries[0]?.contentRect.height ?? 0;

      const lineHeight =
        parseFloat(getComputedStyle(this).fontSize) * LINE_HEIGHT_EM;

      return lineHeight ? Math.floor(height / lineHeight) : 0;
    },
  });

  protected render() {
    return html`
      <ha-fade-in .duration=${300} easing="ease-in">
        <div role="progressbar" aria-label=${ifDefined(this.label)}>
          ${Array.from(
            { length: this.lines ?? this._fitLineCount.value ?? 0 },
            (_, i) =>
              html`<div class="line">
                <ha-skeleton-text
                  style=${styleMap({
                    "--ha-skeleton-text-width": `${LINE_WIDTHS[i % LINE_WIDTHS.length]}%`,
                  })}
                ></ha-skeleton-text>
              </div>`
          )}
        </div>
      </ha-fade-in>
    `;
  }

  static styles = css`
    :host {
      position: absolute;
      inset: 0;
      box-sizing: border-box;
      padding: var(--ha-skeleton-log-padding, var(--ha-space-2));
      overflow: hidden;
    }
    :host([lines]) {
      display: block;
      position: static;
    }
    .line {
      display: flex;
      align-items: center;
      height: ${unsafeCSS(LINE_HEIGHT_EM)}em;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-skeleton-log": HaSkeletonLog;
  }
}
