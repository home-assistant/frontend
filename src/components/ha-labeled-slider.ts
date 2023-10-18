import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-icon";
import "./ha-slider";
import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-labeled-slider")
class HaLabeledSlider extends LitElement {
  @property() public labeled? = false;

  @property() public caption?: string;

  @property() public disabled?: boolean;

  @property() public required?: boolean;

  @property() public min: number = 0;

  @property() public max: number = 100;

  @property() public step: number = 1;

  @property() public helper?: string;

  @property() public extra = false;

  @property() public icon?: string;

  @property() public value?: number;

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
          labeled=${this.labeled}
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

  static get styles(): CSSResultGroup {
    return css`
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-labeled-slider": HaLabeledSlider;
  }
}
