import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-icon";
import "./ha-input-helper-text";
import "./ha-slider";

@customElement("ha-labeled-slider")
class HaLabeledSlider extends LitElement {
  @property({ type: Boolean }) public labeled = false;

  @property() public caption?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ type: Number }) public min = 0;

  @property({ type: Number }) public max = 100;

  @property({ type: Number }) public step = 1;

  @property() public helper?: string;

  @property({ type: Boolean }) public extra = false;

  @property() public icon?: string;

  @property({ type: Number }) public value?: number;

  protected render() {
    return html`
      <div class="title">${this._getTitle()}</div>
      <div class="extra-container"><slot name="extra"></slot></div>
      <div class="slider-container">
        ${this.icon ? html`<ha-icon icon=${this.icon}></ha-icon>` : nothing}
        <ha-slider
          .min=${this.min}
          .max=${this.max}
          .step=${this.step}
          .labeled=${this.labeled}
          .disabled=${this.disabled}
          .value=${this.value}
          @change=${this._inputChanged}
        ></ha-slider>
      </div>
      ${this.helper
        ? html`<ha-input-helper-text> ${this.helper} </ha-input-helper-text>`
        : nothing}
    `;
  }

  private _getTitle(): string {
    return `${this.caption}${this.caption && this.required ? " *" : ""}`;
  }

  private _inputChanged(ev) {
    fireEvent(this, "value-changed", {
      value: Number((ev.target as any).value),
    });
  }

  static styles = css`
    :host {
      display: block;
    }

    .title {
      margin: 5px 0 8px;
      color: var(--primary-text-color);
    }

    .slider-container {
      display: flex;
    }

    ha-icon {
      margin-top: 8px;
      color: var(--secondary-text-color);
    }

    ha-slider {
      flex-grow: 1;
      background-image: var(--ha-slider-background);
      border-radius: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-labeled-slider": HaLabeledSlider;
  }
}
