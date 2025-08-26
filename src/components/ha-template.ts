import type { PropertyValues } from "lit";
import { LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import nunjucks from "nunjucks";
import type { HomeAssistant } from "../types";

@customElement("ha-template")
export class HaTemplate extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public content?: string;

  protected _accessedEntityIds: string[] = [];

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    return (
      super.shouldUpdate(changedProperties) &&
      changedProperties.has("hass") &&
      (!this._accessedEntityIds.length ||
        this._accessedEntityIds.some(
          (id) =>
            this.hass?.states[id].state !==
            changedProperties.get("hass")?.states[id].state
        ))
    );
  }

  protected render() {
    return this._renderTemplate(this.content || "", {});
  }

  protected _renderTemplate(template: string, context: Record<string, any>) {
    this._accessedEntityIds = [];
    try {
      return nunjucks.renderString(template, {
        hass: this.hass,
        states: (id: string) => {
          this._accessedEntityIds.push(id);
          return this.hass?.states[id]?.state;
        },
        is_state: (id: string, value: string) => {
          this._accessedEntityIds.push(id);
          return this.hass?.states[id]?.state === value;
        },
        ...context,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug(`Error rendering template: ${error}`);
      return template;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-template": HaTemplate;
  }
}
