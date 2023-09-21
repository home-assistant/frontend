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
      /* Polyfill form is sized and vertically aligned with true form, then positioned offscreen
      rather than hiding so it does not create a new stacking context */
      .password-manager-polyfill {
        position: absolute;
        box-sizing: border-box;
      }
      /* Excluding our wrapper, move any children back on screen, including anything injected that might not already be positioned */
      .password-manager-polyfill > *:not(.wrapper),
      .password-manager-polyfill > .wrapper > * {
        position: relative;
        left: 10000px;
      }
      /* Size and hide our polyfill fields */
      .password-manager-polyfill .underneath {
        display: block;
        box-sizing: border-box;
        width: 100%;
        padding: 0 16px;
        border: 0;
        z-index: -1;
        height: 21px;
        /* Transparency is only needed to hide during paint or in case of misalignment,
        but LastPass will fail if it's 0, so we use 1% */
        opacity: 0.01;
      }
      .password-manager-polyfill input.underneath {
        height: 28px;
        margin-bottom: 30.5px;
      }
      /* Button position is not important, but size should not be zero */
      .password-manager-polyfill > input.underneath[type="submit"] {
        width: 1px;
        height: 1px;
        margin: 0 auto;
        overflow: hidden;
      }
      /* Ensure injected elements will be on top */
      .password-manager-polyfill > *:not(.underneath, .wrapper),
      .password-manager-polyfill > .wrapper > *:not(.underneath) {
        isolation: isolate;
        z-index: auto;
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
          action="/auth"
          method="post"
          @submit=${this._handleSubmit}
        >
          ${autocompleteLoginFields(this.step.data_schema).map((input) =>
            this.render_input(input)
          )}
          <input
            type="submit"
            value="Login"
            class="underneath"
            tabindex="-2"
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
      <!-- Label is a sibling so it can be stacked underneath without affecting injections adjacent to input (e.g. LastPass) -->
      <label for=${schema.name} class="underneath" aria-hidden="true">
        ${schema.name}
      </label>
      <!-- LastPass fails if the input is hidden directly, so we trick it and hide a wrapper instead -->
      <div class="wrapper" aria-hidden="true">
        <!-- LastPass fails with tabindex of -1, so we trick with -2 -->
        <input
          class="underneath"
          tabindex="-2"
          .id=${schema.name}
          .name=${schema.name}
          .type=${inputType}
          .value=${this.stepData[schema.name] || ""}
          .autocomplete=${schema.autocomplete}
          @input=${this._valueChanged}
          @change=${this._valueChanged}
        />
      </div>
    `;
  }

  private _handleSubmit(ev: SubmitEvent) {
    ev.preventDefault();
    fireEvent(this, "form-submitted");
  }

  private _valueChanged(ev: Event) {
    const target = ev.target as HTMLInputElement;
    this.stepData = { ...this.stepData, [target.id]: target.value };
    fireEvent(this, "value-changed", {
      value: this.stepData,
    });
  }
}
