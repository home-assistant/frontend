import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";
import "../ha-formfield";
import "../ha-switch";
import "../ha-input-helper-text";

@customElement("ha-selector-boolean")
export class HaBooleanSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public value = false;

  @property() public placeholder?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    return html`
      <ha-formfield alignEnd spaceBetween .label=${this.label}>
        <ha-switch
          .checked=${this.value ?? this.placeholder === true}
          @change=${this._handleChange}
          .disabled=${this.disabled}
        ></ha-switch>
        <span slot="label">
          <p class="primary">${this.label}</p>
          ${this.helper
            ? html`<p class="secondary">${this.helper}</p>`
            : nothing}
        </span>
      </ha-formfield>
    `;
  }

  private _handleChange(ev) {
    const value = ev.target.checked;
    if (this.value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    ha-formfield {
      display: flex;
      min-height: 56px;
      align-items: center;
      --mdc-typography-body2-font-size: 1em;
    }
    p {
      margin: 0;
    }
    .secondary {
      direction: var(--direction);
      padding-top: 4px;
      box-sizing: border-box;
      color: var(--secondary-text-color);
      font-size: 0.875rem;
      font-weight: var(
        --mdc-typography-body2-font-weight,
        var(--ha-font-weight-normal)
      );
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-boolean": HaBooleanSelector;
  }
}
