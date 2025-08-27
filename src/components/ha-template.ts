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

  protected shouldUpdate(): boolean {
    if (this.hass) {
      this._template.hass = this.hass;
      this._template.content = this.content;
      this._template.context = this.context;
    }
    return this._template.shouldUpdate;
  }

  public render() {
    try {
      return this._template.render();
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
