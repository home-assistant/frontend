import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-textfield";
import { HaFormElement, HaFormFrontendComponent } from "./types";
import { HomeAssistant } from "../../types";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import "./FrontendFormComponents/FrontendFormComponent";

@customElement("ha-form-frontend-component")
export class HaFormFrontendComponentClass
  extends LitElement
  implements HaFormElement
{
  @property({ attribute: false }) public schema!: HaFormFrontendComponent;

  @property({ attribute: false }) public data!: any;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public submit_fn!: (
    evt: Event
  ) => Promise<void> | null;

  @property() public label!: string;

  @property({ type: Boolean }) public disabled = false;

  protected render(): TemplateResult {
    return html`${dynamicElement(this.schema.component_name, {
      hass: this.hass,
      data: this.data,
      schema: this.schema,
      submit_fn: this.submit_fn,
    })}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-frontend-component": HaFormFrontendComponentClass;
  }
}
