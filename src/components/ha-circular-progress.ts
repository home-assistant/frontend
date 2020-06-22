import {
  LitElement,
  TemplateResult,
  property,
  svg,
  PropertyValues,
  html,
  customElement,
  unsafeCSS,
} from "lit-element";
// @ts-ignore
import progressStyles from "@material/circular-progress/dist/mdc.circular-progress.min.css";
import { MDCCircularProgress } from "@material/circular-progress";

const DETERMINATE_SVG = {
  small: svg`<svg class="mdc-circular-progress__determinate-circle-graphic" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle class="mdc-circular-progress__determinate-circle" cx="12" cy="12" r="8.75" stroke-dasharray="54.978" stroke-dashoffset="54.978"/>
</svg>`,
  medium: svg`<svg class="mdc-circular-progress__determinate-circle-graphic" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle class="mdc-circular-progress__determinate-circle" cx="16" cy="16" r="12.5" stroke-dasharray="78.54" stroke-dashoffset="78.54"/>
</svg>`,
  large: svg`<svg class="mdc-circular-progress__determinate-circle-graphic" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <circle class="mdc-circular-progress__determinate-circle" cx="24" cy="24" r="18" stroke-dasharray="113.097" stroke-dashoffset="113.097"/>
</svg>`,
};

const INDETERMINATE_SVG = {
  small: svg`<svg class="mdc-circular-progress__indeterminate-circle-graphic" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="8.75" stroke-dasharray="54.978" stroke-dashoffset="27.489"/>
</svg>`,
  medium: svg`<svg class="mdc-circular-progress__indeterminate-circle-graphic" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="12.5" stroke-dasharray="78.54" stroke-dashoffset="39.27"/>
</svg>`,
  large: svg`<svg class="mdc-circular-progress__indeterminate-circle-graphic" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="18" stroke-dasharray="113.097" stroke-dashoffset="56.549"/>
</svg>`,
};

@customElement("ha-circular-progress")
class HaSpinner extends LitElement {
  @property({ type: Boolean })
  public active = false;

  @property()
  public alt = "Loading";

  @property()
  public size: keyof typeof INDETERMINATE_SVG = "medium";

  private _foundation!: MDCCircularProgress["foundation_"];

  protected firstUpdated(changedProps: PropertyValues) {
    super.updated(changedProps);
    this._foundation = new MDCCircularProgress(
      this.shadowRoot!.querySelector(".mdc-circular-progress")!
    ).getDefaultFoundation();

    // For now hardcode at indeterminate
    this._foundation.setDeterminate(false);
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!changedProps.has("active")) {
      return;
    }

    if (this.active) {
      this._foundation.open();
    } else {
      this._foundation.close();
    }
  }

  protected render(): TemplateResult | void {
    const determinatePart = DETERMINATE_SVG[this.size];
    const indeterminatePart = INDETERMINATE_SVG[this.size];

    // ignoring prettier as it will introduce unwanted whitespace
    // prettier-ignore
    return html`
      <div
        class=${`mdc-circular-progress mdc-circular-progress--${this.size}`}
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
    "ha-circular-progress": HaSpinner;
  }
}
