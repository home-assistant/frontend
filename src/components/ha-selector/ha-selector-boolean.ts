import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { BooleanSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-checkbox";
import "../ha-formfield";
import "../ha-input-helper-text";
import "../ha-switch";

@customElement("ha-selector-boolean")
export class HaBooleanSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: BooleanSelector;

  @property({ type: Boolean }) public value = false;

  @property() public placeholder?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    const checkbox = this.selector.boolean?.mode === "checkbox";
    return html`
      <ha-formfield .alignEnd=${!checkbox} spaceBetween .label=${this.label}>
        ${checkbox
          ? html`
              <ha-checkbox
                .checked=${this.value ?? this.placeholder === true}
                @change=${this._handleChange}
                .disabled=${this.disabled}
              ></ha-checkbox>
            `
          : html`
              <ha-switch
                .checked=${this.value ?? this.placeholder === true}
                @change=${this._handleChange}
                .disabled=${this.disabled}
              ></ha-switch>
            `}
      </ha-formfield>
      ${this.helper
        ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
        : ""}
    `;
  }

  private _handleChange(ev) {
    const value = ev.target.checked;
    if (this.value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-formfield {
        display: flex;
        height: 56px;
        align-items: center;
        --mdc-typography-body2-font-size: 1em;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-boolean": HaBooleanSelector;
  }
}
