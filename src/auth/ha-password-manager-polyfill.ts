import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import type { HaFormSchema } from "../components/ha-form/types";
import { autocompleteLoginFields } from "../data/auth";
import type { DataEntryFlowStep } from "../data/data_entry_flow";

declare global {
  interface HTMLElementTagNameMap {
    "ha-password-manager-polyfill": HaPasswordManagerPolyfill;
  }
  interface HASSDomEvents {
    "form-submitted": undefined;
  }
}

const ENABLED_HANDLERS = [
  "homeassistant",
  "legacy_api_password",
  "command_line",
];

@customElement("ha-password-manager-polyfill")
export class HaPasswordManagerPolyfill extends LitElement {
  @property({ attribute: false }) public step?: DataEntryFlowStep;

  @property({ attribute: false }) public stepData: any;

  @property({ attribute: false }) public boundingRect?: DOMRect;

  private _styleElement?: HTMLStyleElement;

  public connectedCallback() {
    super.connectedCallback();
    this._styleElement = document.createElement("style");
    this._styleElement.textContent = css`
      /* Polyfill form is sized and aligned with true form, then positioned offscreen
      rather than hiding so it does not create a new stacking context */
      .password-manager-polyfill {
        position: absolute;
      }
      /* Move any children back on screen, including anything injected that might not already be positioned */
      .password-manager-polyfill > * {
        position: relative;
        left: 10000px;
      }
      /* Size and underlay our polyfill fields */
      .password-manager-polyfill > input.underlay {
        width: 100%;
        height: 62px;
        padding: 0;
        border: 0;
        opacity: 0;
        z-index: -1;
      }
      /* Button position is not important, but size should not be zero */
      .password-manager-polyfill > input.underlay[type="submit"] {
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
    `.toString();
    document.head.append(this._styleElement);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._styleElement?.remove();
    delete this._styleElement;
  }

  protected createRenderRoot() {
    // Add under document body so the element isn't placed inside any shadow roots
    return document.body;
  }

  protected render() {
    if (
      this.step &&
      this.step.type === "form" &&
      this.step.step_id === "init" &&
      ENABLED_HANDLERS.includes(this.step.handler[0])
    ) {
      return html`
        <form
          class="password-manager-polyfill"
          style=${styleMap({
            top: `${this.boundingRect?.y || 148}px`,
            left: `calc(50% - ${
              (this.boundingRect?.width || 360) / 2
            }px - 10000px)`,
            width: `${this.boundingRect?.width || 360}px`,
          })}
          @submit=${this._handleSubmit}
        >
          ${autocompleteLoginFields(this.step.data_schema).map((input) =>
            this.render_input(input)
          )}
          <input
            type="submit"
            value="Sign in"
            class="underlay"
            aria-hidden="true"
          />
        </form>
      `;
    }
    return nothing;
  }

  private render_input(schema: HaFormSchema) {
    const inputType = schema.name.includes("password") ? "password" : "text";
    if (schema.type !== "string") {
      return "";
    }
    return html`
      <input
        .id=${schema.name}
        .name=${schema.name}
        .type=${inputType}
        .value=${this.stepData[schema.name] || ""}
        .autocomplete=${schema.autocomplete}
        class="underlay"
        aria-hidden="true"
        @input=${this._valueChanged}
        @change=${this._valueChanged}
      />
    `;
  }

  private _handleSubmit(ev: Event) {
    ev.preventDefault();
    fireEvent(this, "form-submitted");
  }

  private _valueChanged(ev: Event) {
    const target = ev.target! as HTMLInputElement;
    this.stepData = { ...this.stepData, [target.id]: target.value };
    fireEvent(this, "value-changed", {
      value: this.stepData,
    });
  }
}
