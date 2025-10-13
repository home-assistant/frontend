import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import parseAspectRatio from "../common/util/parse-aspect-ratio";

const DEFAULT_ASPECT_RATIO = "16:9";

@customElement("ha-aspect-ratio")
export class HaAspectRatio extends LitElement {
  @property({ type: String, attribute: "aspect-ratio" })
  public aspectRatio?: string;

  private _ratio: {
    w: number;
    h: number;
  } | null = null;

  public willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("aspect_ratio") || this._ratio === null) {
      this._ratio = this.aspectRatio
        ? parseAspectRatio(this.aspectRatio)
        : null;

      if (this._ratio === null || this._ratio.w <= 0 || this._ratio.h <= 0) {
        this._ratio = parseAspectRatio(DEFAULT_ASPECT_RATIO);
      }
    }
  }

  protected render(): unknown {
    if (!this.aspectRatio) {
      return html`<slot></slot>`;
    }
    return html`
      <div
        class="ratio"
        style=${styleMap({
          paddingBottom: `${((100 * this._ratio!.h) / this._ratio!.w).toFixed(2)}%`,
        })}
      >
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    .ratio ::slotted(*) {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-aspect-ratio": HaAspectRatio;
  }
}
