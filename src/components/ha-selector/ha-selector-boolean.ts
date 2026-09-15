import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-switch";
import "../ha-input-helper-text";

@customElement("ha-selector-boolean")
export class HaBooleanSelector extends LitElement {
  @property({ type: Boolean }) public value = false;

  @property() public placeholder?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    return html`
      <ha-switch
        .checked=${this.value ?? this.placeholder === true}
        @change=${this._handleChange}
        .disabled=${this.disabled}
      >
        <p class="primary">${this.label}</p>
        ${this.helper ? html`<p class="secondary">${this.helper}</p>` : nothing}
      </ha-switch>
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
    :host {
      display: block;
    }
    ha-switch {
      display: flex;
      width: 100%;
      min-height: 56px;
      align-items: center;
    }
    /* The switch renders its control before the label, so flip the row to keep
       the label on the start side with the control pushed to the end. */
    ha-switch::part(base) {
      width: 100%;
      flex-direction: row-reverse;
      justify-content: space-between;
      gap: var(--ha-space-2);
    }
    ha-switch::part(label) {
      margin-inline-start: 0;
      line-height: var(--ha-line-height-normal);
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
