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
    const title = this._getTitle();
    return html`
      ${title ? html`<div class="title">${title}</div>` : nothing}
      <div class="extra-container"><slot name="extra"></slot></div>
      <div class="slider-container">
        ${this.icon ? html`<ha-icon icon=${this.icon}></ha-icon>` : nothing}
        <div class="slider-wrapper">
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
      </div>
      ${this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}>
            ${this.helper}
          </ha-input-helper-text>`
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
      align-items: center;
    }

    ha-icon {
      color: var(--secondary-text-color);
    }

    .slider-wrapper {
      padding: 0 8px;
      display: flex;
      flex-grow: 1;
      align-items: center;
      background-image: var(--ha-slider-background);
      border-radius: var(--ha-border-radius-sm);
      height: 32px;
    }

    ha-slider {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-labeled-slider": HaLabeledSlider;
  }
}
