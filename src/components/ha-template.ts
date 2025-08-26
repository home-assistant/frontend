import type { PropertyValues } from "lit";
import { LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../types";
import { HaTemplate } from "../common/template";

@customElement("ha-template")
export class HaTemplateElement extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public content!: string;

  @property({ attribute: false }) public context: Record<string, any> = {};

  private _template = new HaTemplate();

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    return (
      this._template.shouldUpdate(changedProperties, "content") ||
      changedProperties.has("context")
    );
  }

  public render() {
    try {
      return this._template.render(this.hass!, this.content, this.context);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug(`Error rendering template: ${error}`);
      return this.content;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-template": HaTemplateElement;
  }
}
