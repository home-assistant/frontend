import {
  LitElement,
  TemplateResult,
  property,
  svg,
  html,
  customElement,
  unsafeCSS,
  SVGTemplateResult,
} from "lit-element";
// @ts-ignore
import progressStyles from "@material/circular-progress/dist/mdc.circular-progress.min.css";
import { classMap } from "lit-html/directives/class-map";

type sizes = "small" | "medium" | "large";

@customElement("ha-circular-progress")
export class HaCircularProgress extends LitElement {
  @property({ type: Boolean })
  public active = false;

  @property()
  public alt = "Loading";

  @property()
  public size: sizes = "medium";

  protected render(): TemplateResult | void {
    let determinatePart: SVGTemplateResult;
    let indeterminatePart: SVGTemplateResult;

    if (this.size === "small") {
      determinatePart = svg`
        <svg class="mdc-circular-progress__determinate-circle-graphic" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle class="mdc-circular-progress__determinate-circle" cx="12" cy="12" r="8.75" stroke-dasharray="54.978" stroke-dashoffset="54.978"/>
        </svg>`;
      indeterminatePart = svg`
        <svg class="mdc-circular-progress__indeterminate-circle-graphic" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8.75" stroke-dasharray="54.978" stroke-dashoffset="27.489"/>
        </svg>`;
    } else if (this.size === "large") {
      determinatePart = svg`
        <svg class="mdc-circular-progress__determinate-circle-graphic" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <circle class="mdc-circular-progress__determinate-circle" cx="24" cy="24" r="18" stroke-dasharray="113.097" stroke-dashoffset="113.097"/>
        </svg>`;
      indeterminatePart = svg`
        <svg class="mdc-circular-progress__indeterminate-circle-graphic" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="18" stroke-dasharray="113.097" stroke-dashoffset="56.549"/>
        </svg>`;
    } else {
      // medium
      determinatePart = svg`
        <svg class="mdc-circular-progress__determinate-circle-graphic" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle class="mdc-circular-progress__determinate-circle" cx="16" cy="16" r="12.5" stroke-dasharray="78.54" stroke-dashoffset="78.54"/>
        </svg>`;
      indeterminatePart = svg`
        <svg class="mdc-circular-progress__indeterminate-circle-graphic" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12.5" stroke-dasharray="78.54" stroke-dashoffset="39.27"/>
        </svg>`;
    }

    // ignoring prettier as it will introduce unwanted whitespace
    // prettier-ignore
    return html`
      <div
        class="mdc-circular-progress ${classMap({
          "mdc-circular-progress--indeterminate": this.active,
          [`mdc-circular-progress--${this.size}`]: true,
        })}"
        role="progressbar"
        aria-label=${this.alt}
        aria-valuemin="0"
        aria-valuemax="1"
      >
        <div class="mdc-circular-progress__determinate-container">
          ${determinatePart}
        </div>
        <div class="mdc-circular-progress__indeterminate-container">
          <div class="mdc-circular-progress__spinner-layer">
            <div class="mdc-circular-progress__circle-clipper mdc-circular-progress__circle-left">
              ${indeterminatePart}
            </div><div class="mdc-circular-progress__gap-patch">
              ${indeterminatePart}
            </div><div class="mdc-circular-progress__circle-clipper mdc-circular-progress__circle-right">
              ${indeterminatePart}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return unsafeCSS(progressStyles);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-circular-progress": HaCircularProgress;
  }
}
