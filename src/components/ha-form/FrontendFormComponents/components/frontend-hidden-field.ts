import { customElement, property } from "lit/decorators";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { HaFormElement, HaFormFrontendComponent } from "../../types";

@customElement("frontend-hidden-field")
export class FrontendHiddenField extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public schema!: HaFormFrontendComponent;

  @property({ attribute: false }) public data!: any;

  @property({ attribute: false }) public submit_fn!: (
    evt: Event
  ) => Promise<void> | null;

  @property() public label!: string;

  @property({ type: Boolean }) public disabled = false;

  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    fireEvent(this, "value-changed", { value: this.schema.options.default });
  }

  protected render(): TemplateResult {
    return html`<span></span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "frontend-hidden-field": FrontendHiddenField;
  }
}
