import { html, LitElement, css } from "lit";
import { customElement, property } from "lit/decorators";
import { assert, literal, object, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import type { HomeAssistant } from "../../../../../types";
import type { UrlHashCondition } from "../../../common/validate-condition";

const urlHashConditionStruct = object({
  condition: literal("url_hash"),
  hash: string(),
});

@customElement("ha-card-condition-url_hash")
export class HaCardConditionUrlHash extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: UrlHashCondition;

  @property({ type: Boolean }) public disabled = false;

  static styles = css`
    .hash-input-container {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-top: 4px;
    }

    .hash-prefix {
      color: var(--primary-text-color);
      font-size: 14px;
      font-weight: 500;
      font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
      user-select: none;
      margin-top: 16px; /* Align with text field input baseline */
      min-width: 16px;
      text-align: center;
      opacity: 0.8;
      transition: opacity 0.2s ease;
    }

    .hash-prefix:hover {
      opacity: 1;
    }

    ha-textfield {
      flex: 1;
    }

    ha-textfield::part(input) {
      font-family: var(--mdc-typography-body1-font-family, Roboto, sans-serif);
    }

    /* Ensure proper spacing and alignment */
    :host {
      display: block;
      width: 100%;
    }
  `;

  public static get defaultConfig(): UrlHashCondition {
    return { condition: "url_hash", hash: "" };
  }

  protected static validateUIConfig(condition: UrlHashCondition) {
    return assert(condition, urlHashConditionStruct);
  }

  protected render() {
    return html`
      <div class="hash-input-container">
        <span class="hash-prefix">#</span>
        <ha-textfield
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.condition-editor.condition.url_hash.hash"
          )}
          .placeholder=${"dashboard"}
          .value=${this.condition.hash || ""}
          .disabled=${this.disabled}
          @input=${this._valueChanged}
        ></ha-textfield>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const target = ev.currentTarget as HTMLInputElement;
    const value = target.value;

    const condition: UrlHashCondition = {
      ...this.condition,
      hash: value,
    };

    fireEvent(this, "value-changed", { value: condition });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-url_hash": HaCardConditionUrlHash;
  }
}
